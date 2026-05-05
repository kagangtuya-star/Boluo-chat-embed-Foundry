import { loadAvatar } from "./avatarCache.mjs";
import { normalizeDialoguePages } from "./formatting.mjs";
import { DIALOGUE_CLIENT_DEFAULTS } from "./settings.mjs";
import { countVisibleCharacters, sliceHtmlByVisibleCharacters } from "./typewriter.mjs";

const MODULE_NAMESPACE = "Boluo-chat-embed";
const TAB_ICON_SETTING_KEY = "tabIcon";
const DEFAULT_TAB_ICON = "fa-lemon";
const ICON_STYLE_CLASSES = new Set(["fa-solid", "fa-regular", "fa-brands", "fa-light", "fa-thin", "fa-duotone"]);
const ICON_MODIFIER_CLASSES = new Set(["fa-fw", "fa-spin", "fa-pulse", "fa-border", "fa-inverse", "fa-ul", "fa-li"]);
const CLIENT_SETTING_KEYS = {
	dialogueWidth: "dialogueWidth",
	dialogueHeight: "dialogueHeight",
	dialogueTop: "dialogueTop",
	dialogueLeft: "dialogueLeft",
	dialogueCollapsed: "dialogueCollapsed",
	dialogueCollapsedTop: "dialogueCollapsedTop",
	dialogueCollapsedLeft: "dialogueCollapsedLeft",
	dialogueCollapsedWidth: "dialogueCollapsedWidth",
	dialogueCollapsedHeight: "dialogueCollapsedHeight"
};

const FALLBACK_AVATAR = "data:image/svg+xml;utf8," + encodeURIComponent(
	"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'><rect width='240' height='240' rx='24' fill='#1f2330'/><circle cx='120' cy='90' r='44' fill='#8fa0c7'/><path d='M48 214c14-42 48-64 72-64s58 22 72 64' fill='#8fa0c7'/></svg>"
);

let dialogueApplication = null;

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
	return escapeHtml(value).replace(/'/g, "&#39;");
}

function resolveNameColor(color) {
	if (color && typeof CSS !== "undefined" && CSS.supports("color", color)) {
		return color;
	}

	return "#f2dbff";
}

function resolveThemeColor(color) {
	if (color && typeof CSS !== "undefined" && CSS.supports("color", color)) {
		return color;
	}

	return "#0e0f10";
}

function getCollapsedIconClasses() {
	const rawIcon = String(game.settings.get(MODULE_NAMESPACE, TAB_ICON_SETTING_KEY) ?? DEFAULT_TAB_ICON).trim();
	const tokens = rawIcon.split(/\s+/).filter(Boolean);
	if (!tokens.length) {
		return ["fa-solid", DEFAULT_TAB_ICON];
	}

	if (tokens.length === 1) {
		const iconToken = tokens[0];
		if (/^fa-[a-z0-9-]+$/i.test(iconToken) && !ICON_STYLE_CLASSES.has(iconToken)) {
			return ["fa-solid", iconToken];
		}
		return ["fa-solid", DEFAULT_TAB_ICON];
	}

	const hasStyleClass = tokens.some((token) => ICON_STYLE_CLASSES.has(token));
	const hasIconClass = tokens.some((token) =>
		/^fa-[a-z0-9-]+$/i.test(token) &&
		!ICON_STYLE_CLASSES.has(token) &&
		!ICON_MODIFIER_CLASSES.has(token) &&
		!token.startsWith("fa-rotate-") &&
		!token.startsWith("fa-flip-")
	);
	const result = Array.from(new Set(tokens.filter((token) => /^fa-[a-z0-9-]+$/i.test(token))));
	if (!hasStyleClass) {
		result.unshift("fa-solid");
	}
	if (!hasIconClass) {
		result.push(DEFAULT_TAB_ICON);
	}
	return Array.from(new Set(result));
}

export class BoluoDialogueApplication extends Application {
	constructor(options = {}) {
		super(options);
		this.dialogueStore = window.BoluoChatEmbed?.dialogueStore ?? null;
		this.unsubscribe = null;
		this.typingTimer = 0;
		this.advanceTimer = 0;
		this.persistTimer = 0;
		this.visibleCharacters = 0;
		this.pageIndex = 0;
		this.currentMessageKey = "";
		this.lastPlaybackSettingsKey = "";
		this.lastWindowSettingsKey = "";
		this.playbackCompleted = false;
		this.avatarUrl = FALLBACK_AVATAR;
		this.currentAvatarSource = "";
		this.avatarLoadToken = 0;
		this.isSyncingPosition = false;
		this.scrollSyncFrame = 0;
		this.suppressCollapsedClick = false;

		if (this.dialogueStore) {
			const dialogueStore = this.dialogueStore;
			this.unsubscribe = dialogueStore.subscribe(() => {
				this.handleStoreUpdate();
			});
		}
	}

	static get defaultOptions() {
		return {
			...super.defaultOptions,
			classes: ["boluo-dialogue-window"],
			id: "boluo-dialogue-window",
			popOut: true,
			width: 640,
			height: 280,
			resizable: false,
			minimizable: false,
			template: "modules/Boluo-chat-embed/templates/default.html",
			title: "CRPG 对话框"
		};
	}

	getData() {
		return {
			content: "<div id=\"boluo-dialogue-root\" style=\"height:100%;width:100%\"></div>"
		};
	}

	activateListeners(html) {
		super.activateListeners(html);
		this.syncWindowGeometryFromSettings();
		this.renderDialogue();
	}

	setPosition(options = {}) {
		const result = super.setPosition(options);
		if (this.rendered && !this.isSyncingPosition) {
			this.schedulePersistPosition();
		}
		return result;
	}

	async close(options = {}) {
		this.clearPlaybackTimers();
		this.cancelScrollSync();
		return super.close(options);
	}

	getSettings() {
		return this.dialogueStore?.getState().settings ?? {};
	}

	getQueueState() {
		return this.dialogueStore?.getState().queue ?? { current: null, pending: [], latest: null };
	}

	getPlaybackSettingsKey(settings = this.getSettings()) {
		return JSON.stringify({
			dialogueTypeSpeed: settings.dialogueTypeSpeed,
			dialogueFontSize: settings.dialogueFontSize,
			dialogueWaitSeconds: settings.dialogueWaitSeconds
		});
	}

	getWindowSettingsKey(settings = this.getSettings()) {
		return JSON.stringify({
			dialogueEnabled: settings.dialogueEnabled,
			dialogueCollapsed: settings.dialogueCollapsed,
			dialogueThemeColor: settings.dialogueThemeColor,
			dialogueWidth: settings.dialogueWidth,
			dialogueHeight: settings.dialogueHeight,
			dialogueTop: settings.dialogueTop,
			dialogueLeft: settings.dialogueLeft,
			dialogueCollapsedTop: settings.dialogueCollapsedTop,
			dialogueCollapsedLeft: settings.dialogueCollapsedLeft,
			dialogueCollapsedWidth: settings.dialogueCollapsedWidth,
			dialogueCollapsedHeight: settings.dialogueCollapsedHeight
		});
	}

	isCollapsed() {
		return Boolean(this.getSettings().dialogueCollapsed);
	}

	getWindowPositionPatch(settings = this.getSettings()) {
		return {
			width: this.isCollapsed() ? settings.dialogueCollapsedWidth : settings.dialogueWidth,
			height: this.isCollapsed() ? settings.dialogueCollapsedHeight : settings.dialogueHeight,
			top: this.isCollapsed() && settings.dialogueCollapsedTop >= 0 ? settings.dialogueCollapsedTop : settings.dialogueTop,
			left: this.isCollapsed() ? settings.dialogueCollapsedLeft : settings.dialogueLeft
		};
	}

	getCurrentMessageKey() {
		const current = this.getQueueState().current;
		return current ? `${current.messageId}:${current.text}` : "";
	}

	currentPages() {
		const current = this.getQueueState().current;
		return normalizeDialoguePages(current?.text ?? "");
	}

	clearPlaybackTimers() {
		window.clearTimeout(this.typingTimer);
		window.clearTimeout(this.advanceTimer);
	}

	cancelScrollSync() {
		if (this.scrollSyncFrame) {
			window.cancelAnimationFrame(this.scrollSyncFrame);
			this.scrollSyncFrame = 0;
		}
	}

	handleStoreUpdate() {
		const settings = this.getSettings();
		const queueState = this.getQueueState();
		const playbackSettingsKey = this.getPlaybackSettingsKey(settings);
		const windowSettingsKey = this.getWindowSettingsKey(settings);
		const currentKey = queueState.current ? `${queueState.current.messageId}:${queueState.current.text}` : "";

		if (!settings.dialogueEnabled) {
			this.clearPlaybackTimers();
			if (this.rendered) {
				void super.close();
			}
			return;
		}

		this.syncWindowGeometryFromSettings();

		if (!this.rendered) {
			this.render(true);
			return;
		}

		if (this.currentMessageKey !== currentKey || this.lastPlaybackSettingsKey !== playbackSettingsKey) {
			this.restartPlayback();
		} else {
			this.renderDialogue();
			this.schedulePlayback();
		}

		this.lastPlaybackSettingsKey = playbackSettingsKey;
		this.lastWindowSettingsKey = windowSettingsKey;
	}

	restartPlayback() {
		this.clearPlaybackTimers();
		this.pageIndex = 0;
		this.visibleCharacters = 0;
		this.playbackCompleted = false;
		this.currentMessageKey = this.getCurrentMessageKey();
		void this.syncAvatarForCurrent();
		this.renderDialogue();
		this.schedulePlayback();
	}

	applyQueueEvent(event) {
		this.dialogueStore?.dispatchQueueEvent(event);
	}

	async syncAvatarForCurrent() {
		const current = this.getQueueState().current;
		const token = this.avatarLoadToken + 1;
		this.avatarLoadToken = token;

		if (!current?.avatarUrl) {
			this.avatarUrl = FALLBACK_AVATAR;
			this.currentAvatarSource = "";
			return;
		}

		if (this.currentAvatarSource === current.avatarUrl && this.avatarUrl) {
			return;
		}

		try {
			const image = await loadAvatar(current.avatarUrl);
			if (this.avatarLoadToken !== token) {
				return;
			}
			this.avatarUrl = image.src;
			this.currentAvatarSource = current.avatarUrl;
			this.renderDialogue();
		} catch (_error) {
			if (this.avatarLoadToken !== token) {
				return;
			}
			this.avatarUrl = FALLBACK_AVATAR;
			this.currentAvatarSource = "";
			this.renderDialogue();
		}
	}

	schedulePlayback() {
		this.clearPlaybackTimers();

		if (this.isCollapsed()) {
			return;
		}

		const queueState = this.getQueueState();
		const settings = this.getSettings();
		if (!queueState.current) {
			return;
		}

		const pages = this.currentPages();
		const currentPageHtml = pages[this.pageIndex] ?? pages[0] ?? "";
		const totalVisibleCharacters = countVisibleCharacters(currentPageHtml);

		if (this.visibleCharacters < totalVisibleCharacters) {
			this.playbackCompleted = false;
			this.typingTimer = window.setTimeout(() => {
				this.visibleCharacters = Math.min(this.visibleCharacters + 1, totalVisibleCharacters);
				this.renderDialogue();
				this.schedulePlayback();
			}, Math.max(0, settings.dialogueTypeSpeed ?? 50));
			return;
		}

		if (this.pageIndex < pages.length - 1) {
			this.playbackCompleted = false;
			this.advanceTimer = window.setTimeout(() => {
				this.pageIndex += 1;
				this.visibleCharacters = 0;
				this.renderDialogue();
				this.schedulePlayback();
			}, Math.max(0, (settings.dialogueWaitSeconds ?? 4) * 1000));
			return;
		}

		if (queueState.pending.length === 0) {
			this.playbackCompleted = true;
			this.renderDialogue();
			return;
		}

		this.advanceTimer = window.setTimeout(() => {
			this.applyQueueEvent({ type: "advance" });
		}, this.playbackCompleted ? 0 : Math.max(0, (settings.dialogueWaitSeconds ?? 4) * 1000));
	}

	renderPageIndicator() {
		const totalPages = Math.max(1, this.currentPages().length || 1);
		if (!this.getQueueState().current || totalPages <= 1) {
			return "";
		}

		return `<div class="page-indicator">${this.pageIndex + 1}/${totalPages}</div>`;
	}

	getExpandedRenderState() {
		const queueState = this.getQueueState();
		const settings = this.getSettings();
		const current = queueState.current;
		const pages = this.currentPages();
		const currentPageHtml = pages[this.pageIndex] ?? pages[0] ?? "";
		const totalVisibleCharacters = countVisibleCharacters(currentPageHtml);
		const visibleCharacters = Math.min(
			this.playbackCompleted ? totalVisibleCharacters : this.visibleCharacters,
			totalVisibleCharacters
		);

		return {
			name: current?.displayName ?? "",
			nameColor: resolveNameColor(current?.color ?? ""),
			themeColor: resolveThemeColor(settings.dialogueThemeColor),
			fontSize: settings.dialogueFontSize ?? 24,
			avatarUrl: this.avatarUrl || FALLBACK_AVATAR,
			renderedHtml: currentPageHtml ? sliceHtmlByVisibleCharacters(currentPageHtml, visibleCharacters) : "",
			pageIndicatorText: current && pages.length > 1 ? `${this.pageIndex + 1}/${pages.length}` : ""
		};
	}

	renderDialogue() {
		const root = this.element?.[0]?.querySelector?.("#boluo-dialogue-root");
		if (!root) {
			return;
		}

		if (this.isCollapsed()) {
			if (root.dataset.mode !== "collapsed") {
				root.innerHTML = this.renderCollapsedHtml();
				root.dataset.mode = "collapsed";
				this.bindCollapsedListeners(root);
			} else {
				this.updateCollapsedDom(root);
			}
			return;
		}

		if (root.dataset.mode !== "expanded") {
			root.innerHTML = this.renderExpandedHtml();
			root.dataset.mode = "expanded";
			this.bindExpandedListeners(root);
		}

		this.updateExpandedDom(root);
		this.syncDialogueScroll();
	}

	renderCollapsedHtml() {
		const themeColor = resolveThemeColor(this.getSettings().dialogueThemeColor);
		const iconClasses = getCollapsedIconClasses().join(" ");

		return `
			<section class="boluo-dialogue-shell boluo-dialogue-shell-collapsed">
				<button id="dialogue-collapsed-tab" class="boluo-dialogue-collapsed-tab" type="button" title="单击展开" aria-label="单击展开" style="--boluo-dialogue-theme-color:${escapeAttribute(themeColor)};">
					<i class="boluo-dialogue-collapsed-icon ${escapeAttribute(iconClasses)}" aria-hidden="true"></i>
				</button>
			</section>
		`;
	}

	renderExpandedHtml() {
		const { name, nameColor, themeColor, fontSize, avatarUrl, renderedHtml, pageIndicatorText } = this.getExpandedRenderState();

		return `
			<section class="boluo-dialogue-shell">
				<div id="dialogue-card" class="boluo-dialogue-card" style="--boluo-dialogue-font-size:${fontSize}px; --boluo-dialogue-name-color:${escapeAttribute(nameColor)}; --boluo-dialogue-theme-color:${escapeAttribute(themeColor)};">
					<button id="dialogue-fast-forward" class="boluo-dialogue-window-button boluo-dialogue-fast-forward" type="button" title="快进到最新一条" aria-label="快进到最新一条">»|</button>
					<button id="dialogue-minimize" class="boluo-dialogue-window-button boluo-dialogue-minimize" type="button" title="最小化对话框" aria-label="最小化对话框">—</button>
					<div id="dialogue-drag-handle" class="boluo-dialogue-drag-handle" aria-hidden="true"></div>
					<div class="boluo-dialogue-resize-edge edge-left" data-edge="left"></div>
					<div class="boluo-dialogue-resize-edge edge-right" data-edge="right"></div>
					<div class="boluo-dialogue-resize-edge edge-top" data-edge="top"></div>
					<div class="boluo-dialogue-resize-edge edge-bottom" data-edge="bottom"></div>
					<div class="boluo-dialogue-resize-edge edge-corner" data-edge="corner"></div>
					<div class="boluo-dialogue-message-shell">
						<div class="boluo-dialogue-left-column">
							<div class="boluo-dialogue-portrait-frame">
								<img id="dialogue-character-image" class="boluo-dialogue-character-image" src="${escapeAttribute(avatarUrl)}" alt="${escapeAttribute(name)}" />
							</div>
						</div>
						<div class="boluo-dialogue-right-column">
							<div class="boluo-dialogue-header-row">
								<div id="dialogue-nameplate" class="boluo-dialogue-nameplate">${escapeHtml(name)}</div>
								<div id="dialogue-page-indicator" class="page-indicator"${pageIndicatorText ? "" : " hidden"}>${escapeHtml(pageIndicatorText)}</div>
							</div>
							<div class="boluo-dialogue-copy-stage">
								<div id="dialogue-copy-viewport" class="boluo-dialogue-copy-viewport">
									<div id="dialogue-copy" class="boluo-dialogue-copy">${renderedHtml}</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		`;
	}

	bindCollapsedListeners(root) {
		const button = root.querySelector("#dialogue-collapsed-tab");
		if (!button) {
			return;
		}

		button.addEventListener("click", () => {
			if (this.suppressCollapsedClick) {
				this.suppressCollapsedClick = false;
				return;
			}
			void this.updateClientSettings({ dialogueCollapsed: false }, true);
		});

		this.bindDragHandleElement(button, {
			onFinish: (moved) => {
				if (moved) {
					this.suppressCollapsedClick = true;
				}
			}
		});
	}

	updateCollapsedDom(root) {
		const button = root.querySelector("#dialogue-collapsed-tab");
		if (!button) {
			return;
		}

		button.style.setProperty("--boluo-dialogue-theme-color", resolveThemeColor(this.getSettings().dialogueThemeColor));
	}

	bindExpandedListeners(root) {
		root.querySelector("#dialogue-minimize")?.addEventListener("click", () => {
			void this.updateClientSettings({
				dialogueCollapsed: true,
				dialogueCollapsedWidth: DIALOGUE_CLIENT_DEFAULTS.dialogueCollapsedWidth,
				dialogueCollapsedHeight: DIALOGUE_CLIENT_DEFAULTS.dialogueCollapsedHeight
			}, true);
		});

		root.querySelector("#dialogue-fast-forward")?.addEventListener("click", () => {
			this.applyQueueEvent({ type: "fast-forward-latest" });
		});

		this.bindDragHandle(root);
		this.bindResizeHandles(root);
	}

	updateExpandedDom(root) {
		const state = this.getExpandedRenderState();
		const card = root.querySelector("#dialogue-card");
		if (!card) {
			return;
		}

		card.style.setProperty("--boluo-dialogue-font-size", `${state.fontSize}px`);
		card.style.setProperty("--boluo-dialogue-name-color", state.nameColor);
		card.style.setProperty("--boluo-dialogue-theme-color", state.themeColor);

		const image = root.querySelector("#dialogue-character-image");
		if (image) {
			if (image.getAttribute("src") !== state.avatarUrl) {
				image.setAttribute("src", state.avatarUrl);
			}
			image.setAttribute("alt", state.name);
		}

		const nameplate = root.querySelector("#dialogue-nameplate");
		if (nameplate && nameplate.textContent !== state.name) {
			nameplate.textContent = state.name;
		}

		const pageIndicator = root.querySelector("#dialogue-page-indicator");
		if (pageIndicator) {
			pageIndicator.textContent = state.pageIndicatorText;
			pageIndicator.hidden = !state.pageIndicatorText;
		}

		const copy = root.querySelector("#dialogue-copy");
		if (copy && copy.innerHTML !== state.renderedHtml) {
			copy.innerHTML = state.renderedHtml;
		}
	}

	bindDragHandle(root) {
		const handle = root.querySelector("#dialogue-drag-handle");
		if (!handle) {
			return;
		}

		this.bindDragHandleElement(handle);
	}

	bindDragHandleElement(handle, callbacks = {}) {
		handle.addEventListener("pointerdown", (event) => {
			event.preventDefault();
			const startLeft = Number(this.position.left ?? 0);
			const startTop = Number(this.position.top ?? 0);
			const startX = event.clientX;
			const startY = event.clientY;
			let moved = false;

			const move = (moveEvent) => {
				const dx = moveEvent.clientX - startX;
				const dy = moveEvent.clientY - startY;
				if (!moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
					moved = true;
				}

				super.setPosition({
					left: startLeft + dx,
					top: startTop + dy
				});
			};

			const finish = async () => {
				document.removeEventListener("pointermove", move);
				document.removeEventListener("pointerup", finish);
				document.removeEventListener("pointercancel", finish);
				await this.persistPositionToSettings();
				callbacks.onFinish?.(moved);
			};

			document.addEventListener("pointermove", move);
			document.addEventListener("pointerup", finish);
			document.addEventListener("pointercancel", finish);
		});
	}

	bindResizeHandles(root) {
		root.querySelectorAll(".boluo-dialogue-resize-edge").forEach((edge) => {
			edge.addEventListener("pointerdown", (event) => {
				event.preventDefault();
				event.stopPropagation();

				const edgeName = edge.dataset.edge ?? "";
				const startLeft = Number(this.position.left ?? 0);
				const startTop = Number(this.position.top ?? 0);
				const startWidth = Number(this.position.width ?? 640);
				const startHeight = Number(this.position.height ?? 280);
				const startX = event.clientX;
				const startY = event.clientY;

				const move = (moveEvent) => {
					const dx = moveEvent.clientX - startX;
					const dy = moveEvent.clientY - startY;
					const next = {
						left: startLeft,
						top: startTop,
						width: startWidth,
						height: startHeight
					};

					if (edgeName === "left") {
						next.left = startLeft + dx;
						next.width = Math.max(320, startWidth - dx);
					}
					if (edgeName === "right" || edgeName === "corner") {
						next.width = Math.max(320, startWidth + dx);
					}
					if (edgeName === "top") {
						next.top = startTop + dy;
						next.height = Math.max(180, startHeight - dy);
					}
					if (edgeName === "bottom" || edgeName === "corner") {
						next.height = Math.max(180, startHeight + dy);
					}

					super.setPosition(next);
				};

				const finish = async () => {
					document.removeEventListener("pointermove", move);
					document.removeEventListener("pointerup", finish);
					document.removeEventListener("pointercancel", finish);
					await this.persistPositionToSettings();
				};

				document.addEventListener("pointermove", move);
				document.addEventListener("pointerup", finish);
				document.addEventListener("pointercancel", finish);
			});
		});
	}

	syncDialogueScroll() {
		this.cancelScrollSync();
		this.scrollSyncFrame = window.requestAnimationFrame(() => {
			this.scrollSyncFrame = 0;
			const viewport = this.element?.[0]?.querySelector?.(".boluo-dialogue-copy-viewport");
			if (!viewport) {
				return;
			}

			viewport.scrollTop = viewport.scrollHeight;
		});
	}

	syncWindowGeometryFromSettings() {
		if (!this.rendered) {
			return;
		}

		const patch = this.getWindowPositionPatch();
		const element = this.element?.[0];
		if (element) {
			element.style.minWidth = `${patch.width}px`;
			element.style.minHeight = `${patch.height}px`;
		}

		this.isSyncingPosition = true;
		super.setPosition(patch);
		this.isSyncingPosition = false;
	}

	schedulePersistPosition() {
		window.clearTimeout(this.persistTimer);
		this.persistTimer = window.setTimeout(() => {
			void this.persistPositionToSettings();
		}, 150);
	}

	async persistPositionToSettings() {
		const patch = this.isCollapsed()
			? {
				dialogueCollapsedTop: Math.round(this.position.top ?? 0),
				dialogueCollapsedLeft: Math.round(this.position.left ?? 0),
				dialogueCollapsedWidth: Math.round(this.position.width ?? DIALOGUE_CLIENT_DEFAULTS.dialogueCollapsedWidth),
				dialogueCollapsedHeight: Math.round(this.position.height ?? DIALOGUE_CLIENT_DEFAULTS.dialogueCollapsedHeight)
			}
			: {
				dialogueTop: Math.round(this.position.top ?? 56),
				dialogueLeft: Math.round(this.position.left ?? 88),
				dialogueWidth: Math.round(this.position.width ?? 640),
				dialogueHeight: Math.round(this.position.height ?? 280)
			};

		await this.updateClientSettings(patch, false);
	}

	async updateClientSettings(patch, shouldRerender) {
		this.dialogueStore?.setSettings(patch);

		for (const [key, value] of Object.entries(patch)) {
			const settingKey = CLIENT_SETTING_KEYS[key];
			if (!settingKey) {
				continue;
			}
			await game.settings.set(MODULE_NAMESPACE, settingKey, value);
		}

		if (shouldRerender) {
			this.renderDialogue();
			this.syncWindowGeometryFromSettings();
			this.schedulePlayback();
		}
	}
}

export function ensureDialogueApplication() {
	if (!dialogueApplication) {
		dialogueApplication = new BoluoDialogueApplication();
	}

	return dialogueApplication;
}

export function syncDialogueApplication() {
	const dialogueStore = window.BoluoChatEmbed?.dialogueStore;
	if (!dialogueStore) {
		return null;
	}

	const application = ensureDialogueApplication();
	const settings = dialogueStore.getState().settings;
	if (!settings.dialogueEnabled) {
		if (application.rendered) {
			void application.close();
		}
		return application;
	}

	if (!application.rendered) {
		application.position = {
			...application.position,
			...application.getWindowPositionPatch(settings)
		};
		application.render(true);
	} else {
		application.syncWindowGeometryFromSettings();
		application.renderDialogue();
		application.schedulePlayback();
	}

	return application;
}
