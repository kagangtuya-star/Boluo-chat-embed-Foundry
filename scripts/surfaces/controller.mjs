import { bindFloatingGesture } from "../floatingWindow.mjs";
import { SURFACE_TYPES, parseSurfaceLink, applyTheaterOptions, createTheaterLink, readChannelContext } from "./links.mjs";

const NS = "Boluo-chat-embed";
const get = (key) => game.settings.get(NS, key);
const set = (key, value) => game.settings.set(NS, key, value);

function node(tag, className, text) {
	const element = document.createElement(tag);
	if (className) element.className = className;
	if (text) element.textContent = text;
	return element;
}

function button(label, action, text = label) {
	const element = node("button", "boluo-surface-button", text);
	element.type = "button";
	element.title = label;
	element.setAttribute("aria-label", label);
	element.addEventListener("click", action);
	return element;
}

export class SurfaceController {
	constructor() {
		this.windows = new Map();
		this.context = null;
		this.root = null;
		this.disposers = [];
		this.zIndex = 10000;
		this.saveQueue = Promise.resolve();
		const saved = get("surface-state");
		this.items = new Map();
		for (const entry of Array.isArray(saved?.items) ? saved.items.slice(0, 20) : []) {
			try {
				const surface = parseSurfaceLink(entry.url);
				this.items.set(surface.key, { url: surface.url.href, type: surface.type, id: surface.id, rect: entry.rect });
			} catch { /* 忽略损坏或旧版不支持的链接。 */ }
		}
		this.launcherRect = { left: 88, top: 56, ...saved?.launcher };
		this.onResize = () => {
			this.placeLauncher(this.launcherRect);
			for (const view of this.windows.values()) this.placeWindow(view, view.rect);
		};
		window.addEventListener("resize", this.onResize);
	}

	options() {
		return { transparent: get("theater-transparent"), full: get("theater-full") };
	}

	save() {
		const snapshot = { launcher: { ...this.launcherRect }, items: Array.from(this.items.values()).map((item) => ({ ...item, rect: item.rect && { ...item.rect } })) };
		this.saveQueue = this.saveQueue.catch(() => {}).then(() => set("surface-state", snapshot)).catch(() => {
			ui.notifications.warn("投影布局保存失败，当前窗口仍可使用");
		});
	}

	setContext(context) {
		this.context = context;
		this.updateContextLabel();
	}

	updateContextLabel() {
		if (!this.contextLabel) return;
		const context = this.context ?? readChannelContext(window.BoluoChatEmbed.getEmbeddedUrl());
		this.contextLabel.textContent = context ? `当前频道 · ${context.channelId}` : "先进入 SealChat 频道，或粘贴浮层链接";
	}

	sync() {
		if (get("surface-mode") !== "surfaces") {
			this.destroy();
			return;
		}
		if (!this.root) this.mount();
		this.transparent.checked = this.options().transparent;
		this.full.checked = this.options().full;
		for (const [key, view] of this.windows) {
			const item = this.items.get(key);
			const url = applyTheaterOptions(item.url, this.options());
			if (view.frame.getAttribute("src") !== url) view.frame.src = url;
			view.panel.classList.toggle("boluo-surface-transparent", item.type === "theater" && this.options().transparent);
		}
		this.updateContextLabel();
	}

	mount() {
		this.root = node("aside", "boluo-surface-controller");
		this.root.setAttribute("aria-label", "SealChat 投影控制器");
		this.toggle = button("展开投影控制器", () => {
			if (this.suppressClick) { this.suppressClick = false; return; }
			this.setExpanded(this.menu.hidden);
		}, "◈");
		this.toggle.classList.add("boluo-surface-launcher");
		this.toggle.setAttribute("aria-expanded", "false");
		this.toggle.setAttribute("aria-controls", "boluo-surface-menu");
		this.menu = node("section", "boluo-surface-menu");
		this.menu.id = "boluo-surface-menu";
		this.menu.hidden = true;
		const header = node("header", "boluo-surface-menu-header");
		header.append(node("strong", "", "SealChat 投影"), button("折叠控制器", () => this.setExpanded(false), "—"));
		this.contextLabel = node("p", "boluo-surface-context");
		const form = node("form", "boluo-surface-form");
		const typeLabel = node("label", "", "投影内容");
		this.type = node("select");
		for (const [value, label] of Object.entries(SURFACE_TYPES)) {
			const option = node("option", "", label);
			option.value = value;
			this.type.append(option);
		}
		typeLabel.append(this.type);
		const linkLabel = node("label", "", "浮层链接");
		this.input = node("input");
		this.input.type = "url";
		this.input.placeholder = "小剧场可留空，使用当前频道";
		this.input.autocomplete = "off";
		linkLabel.append(this.input);
		this.type.addEventListener("change", () => {
			this.input.required = this.type.value !== "theater";
			this.input.placeholder = this.input.required ? "粘贴对应资源的 Internal Surface 链接" : "小剧场可留空，使用当前频道";
		});
		this.input.addEventListener("input", () => {
			try { this.type.value = parseSurfaceLink(this.input.value).type; } catch { /* 输入完成后统一校验。 */ }
		});
		const options = node("fieldset", "boluo-surface-options");
		options.append(node("legend", "", "小剧场"));
		const checkbox = (label, key) => {
			const wrapper = node("label");
			const input = node("input");
			input.type = "checkbox";
			input.addEventListener("change", () => void set(key, input.checked).catch(() => ui.notifications.warn("投影设置保存失败")));
			wrapper.append(input, document.createTextNode(label));
			options.append(wrapper);
			return input;
		};
		this.transparent = checkbox("透明背景", "theater-transparent");
		this.full = checkbox("全功能", "theater-full");
		const submit = node("button", "boluo-surface-primary", "打开投影");
		submit.type = "submit";
		this.error = node("p", "boluo-surface-error");
		this.error.setAttribute("role", "alert");
		form.append(typeLabel, linkLabel, options, submit, this.error);
		form.addEventListener("submit", (event) => {
			event.preventDefault();
			try {
				const value = this.input.value.trim() || createTheaterLink(window.BoluoChatEmbed.getEmbeddedUrl(), this.context ?? readChannelContext(window.BoluoChatEmbed.getEmbeddedUrl()), this.options());
				if (parseSurfaceLink(value).type !== this.type.value) throw new Error("链接类型与所选内容不一致");
				this.open(value);
				this.input.value = "";
				this.error.textContent = "";
			} catch (error) { this.error.textContent = error.message; }
		});
		this.list = node("div", "boluo-surface-list");
		this.menu.append(header, this.contextLabel, form, node("h3", "", "我的浮窗"), this.list,
			node("p", "boluo-surface-hint", "仅投影到本机屏幕。全功能按 SealChat 账号权限操作；穿透后可点击下方地图。"));
		this.menu.addEventListener("keydown", (event) => {
			if (event.key === "Escape") { this.setExpanded(false); this.toggle.focus(); }
		});
		this.root.append(this.toggle, this.menu);
		document.body.append(this.root);
		this.disposers.push(bindFloatingGesture(this.toggle, {
			read: () => this.launcherRect, write: (rect) => this.placeLauncher(rect),
			finish: (moved) => { this.suppressClick = moved; this.save(); }
		}));
		this.disposers.push(bindFloatingGesture(header, {
			read: () => this.launcherRect, write: (rect) => this.placeLauncher(rect), finish: () => this.save()
		}));
		this.placeLauncher(this.launcherRect);
		this.renderList();
	}

	setExpanded(expanded) {
		this.menu.hidden = !expanded;
		this.root.dataset.expanded = String(expanded);
		this.toggle.setAttribute("aria-expanded", String(expanded));
		this.toggle.title = expanded ? "折叠投影控制器" : "展开投影控制器";
		this.toggle.setAttribute("aria-label", this.toggle.title);
		this.placeLauncher(this.launcherRect);
		if (expanded) this.type.focus();
	}

	placeLauncher(rect) {
		const visibleWidth = this.menu && !this.menu.hidden ? Math.min(340, window.innerWidth - 16) : 48;
		const visibleHeight = this.menu && !this.menu.hidden ? Math.min(540, window.innerHeight - 16) : 48;
		this.launcherRect = {
			left: Math.max(8, Math.min(Number(rect.left) || 88, window.innerWidth - visibleWidth - 8)),
			top: Math.max(8, Math.min(Number(rect.top) || 56, window.innerHeight - visibleHeight - 8))
		};
		if (!this.root) return;
		Object.assign(this.root.style, { left: `${this.launcherRect.left}px`, top: `${this.launcherRect.top}px` });
		this.menu.style.maxHeight = `${Math.max(100, window.innerHeight - this.launcherRect.top - 8)}px`;
	}

	open(value) {
		const url = applyTheaterOptions(value, this.options());
		const surface = parseSurfaceLink(url);
		let item = this.items.get(surface.key);
		if (!item && this.items.size >= 20) throw new Error("最多保存 20 个浮窗，请先移除不再使用的链接");
		if (!item) {
			item = { url, type: surface.type, id: surface.id };
			this.items.set(surface.key, item);
		} else item.url = url;
		let view = this.windows.get(surface.key);
		if (view) {
			if (view.frame.getAttribute("src") !== url) view.frame.src = url;
			view.panel.hidden = false;
			view.panel.style.zIndex = String(++this.zIndex);
			this.renderList();
			return;
		}
		const panel = node("section", "boluo-surface-window");
		panel.setAttribute("aria-label", SURFACE_TYPES[item.type]);
		panel.classList.toggle("boluo-surface-transparent", item.type === "theater" && this.options().transparent);
		const header = node("header", "boluo-surface-window-header");
		header.append(node("span", "boluo-surface-title", SURFACE_TYPES[item.type]));
		const pass = button("穿透地图", () => {
			view.passThrough = !view.passThrough;
			panel.classList.toggle("boluo-surface-pass-through", view.passThrough);
			pass.setAttribute("aria-pressed", String(view.passThrough));
		}, "穿透");
		pass.setAttribute("aria-pressed", "false");
		header.append(pass, button("收起浮窗", () => { panel.hidden = true; this.renderList(); }, "—"),
			button("关闭浮窗", () => this.close(surface.key), "×"));
		const frame = node("iframe", "boluo-surface-frame");
		frame.title = `SealChat · ${SURFACE_TYPES[item.type]}`;
		frame.allow = "autoplay; fullscreen; clipboard-write";
		frame.setAttribute("allowtransparency", "true");
		frame.referrerPolicy = "strict-origin-when-cross-origin";
		// 与已验证的透明 iframe 宏一致，避免跨颜色方案出现白底。
		frame.style.colorScheme = "light";
		frame.src = url;
		panel.append(header, frame);
		view = { panel, frame, rect: {}, disposers: [], passThrough: false };
		this.windows.set(surface.key, view);
		const gesture = (handle, edge) => {
			view.disposers.push(bindFloatingGesture(handle, {
				read: () => view.rect, write: (rect) => this.placeWindow(view, rect), edge,
				active: (moving) => {
					panel.classList.toggle("boluo-surface-moving", moving);
					if (moving) panel.style.zIndex = String(++this.zIndex);
				},
				finish: () => { item.rect = { ...view.rect }; this.save(); }
			}));
		};
		gesture(header);
		for (const edge of ["left", "right", "top", "bottom", "corner"]) {
			const handle = node("div", `boluo-surface-resize boluo-surface-resize-${edge}`);
			handle.setAttribute("aria-hidden", "true");
			panel.append(handle);
			gesture(handle, edge);
		}
		panel.addEventListener("pointerdown", () => { panel.style.zIndex = String(++this.zIndex); });
		document.body.append(panel);
		this.placeWindow(view, item.rect ?? { left: 140 + this.windows.size * 24, top: 100 + this.windows.size * 24, width: 900, height: 550 });
		panel.style.zIndex = String(++this.zIndex);
		this.save();
		this.renderList();
	}

	placeWindow(view, rect) {
		const width = Math.min(Math.max(320, Number(rect.width) || 900), Math.max(240, window.innerWidth - 16));
		const height = Math.min(Math.max(180, Number(rect.height) || 550), Math.max(120, window.innerHeight - 16));
		view.rect = { width, height,
			left: Math.max(0, Math.min(Number(rect.left) || 0, window.innerWidth - width)),
			top: Math.max(0, Math.min(Number(rect.top) || 0, window.innerHeight - height)) };
		for (const [key, value] of Object.entries(view.rect)) view.panel.style[key] = `${value}px`;
	}

	close(key) {
		const view = this.windows.get(key);
		if (!view) return;
		for (const dispose of view.disposers) dispose();
		view.panel.remove();
		this.windows.delete(key);
		this.renderList();
	}

	renderList() {
		if (!this.list) return;
		this.list.replaceChildren();
		if (!this.items.size) this.list.append(node("p", "boluo-surface-hint", "还没有浮窗。选择内容后打开投影。"));
		for (const [key, item] of this.items) {
			const row = node("div", "boluo-surface-row");
			const title = node("span", "boluo-surface-resource", `${SURFACE_TYPES[item.type]} · ${item.id}`);
			title.title = `${SURFACE_TYPES[item.type]} · ${item.id}`;
			const view = this.windows.get(key);
			row.append(title, button(view && !view.panel.hidden ? "收起" : "打开", () => {
				if (view && !view.panel.hidden) { view.panel.hidden = true; this.renderList(); }
				else this.open(item.url);
			}));
			if (view) row.append(button("关闭", () => this.close(key), "×"));
			else row.append(button("移除保存的链接", () => { this.items.delete(key); this.save(); this.renderList(); }, "×"));
			this.list.append(row);
		}
	}

	destroy() {
		for (const key of this.windows.keys()) this.close(key);
		for (const dispose of this.disposers) dispose();
		this.disposers = [];
		this.root?.remove();
		this.root = null;
	}
}

let controller;
export function syncSurfaceController() {
	controller ??= new SurfaceController();
	controller.sync();
	return controller;
}

export function updateSurfaceContext(context) {
	controller?.setContext(context);
}
