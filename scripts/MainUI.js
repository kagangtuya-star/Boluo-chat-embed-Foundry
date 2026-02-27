import { tabWindow } from "./tabWindow.js";

const MODULE_NAMESPACE = "Boluo-chat-embed";
const LEGACY_NAMESPACE = "embedded-webpage";
const EMBEDDED_URL_CONFIG_KEY = "embeddedUrl";
const TAB_TITLE_CONFIG_KEY = "tabTitle";
const TAB_ICON_CONFIG_KEY = "tabIcon";
const SIDEBAR_TAB_ID = "boluo-chat";
const SIDEBAR_IFRAME_ID = "boluo-chat-sidebar-iframe";
const SIDEBAR_WIDE_CLASS = "boluo-sidebar-wide";
const SIDEBAR_CONTAINER_ID = "ui-right";
const MOBILE_MODE_PARAM_KEY = "mobile";
const EMBED_IFRAME_CLASS = "boluo-chat-iframe";
const EMBED_IFRAME_READY_CLASS = "boluo-iframe-ready";
const DEFAULT_EMBEDDED_URL = "https://app.boluo.chat/zh-CN";
const DEFAULT_TAB_TITLE = "菠萝聊天";
const DEFAULT_TAB_ICON = "fa-lemon";
const ICON_STYLE_CLASSES = new Set(["fa-solid", "fa-regular", "fa-brands", "fa-light", "fa-thin", "fa-duotone"]);
const ICON_MODIFIER_CLASSES = new Set(["fa-fw", "fa-spin", "fa-pulse", "fa-border", "fa-inverse", "fa-ul", "fa-li"]);

let sharedPanel = null;
let panelPlaceholder = null;

/**
 * 注册模块设置，并兼容历史命名空间
 */
async function registerSettings() {
	game.settings.register(MODULE_NAMESPACE, EMBEDDED_URL_CONFIG_KEY, {
		name: "嵌入网页地址（菠萝频道）",
		hint: "请输入要嵌入到右侧选项卡中的网页地址。",
		scope: "world",
		config: true,
		type: String,
		default: DEFAULT_EMBEDDED_URL,
		onChange: () => refreshEmbeddedFrames({ forceReload: true })
	});

	game.settings.register(MODULE_NAMESPACE, TAB_TITLE_CONFIG_KEY, {
		name: "标签标题",
		hint: "侧栏按钮提示与弹窗标题。",
		scope: "world",
		config: true,
		type: String,
		default: DEFAULT_TAB_TITLE,
		onChange: () => updateTabPresentation()
	});

	game.settings.register(MODULE_NAMESPACE, TAB_ICON_CONFIG_KEY, {
		name: "标签图标",
		hint: "请输入 Font Awesome 图标类名，例如 fa-lemon 或 fa-solid fa-lemon。",
		scope: "world",
		config: true,
		type: String,
		default: DEFAULT_TAB_ICON,
		onChange: () => updateTabPresentation()
	});

	if (!game.settings.settings.has(`${LEGACY_NAMESPACE}.${EMBEDDED_URL_CONFIG_KEY}`)) {
		game.settings.register(LEGACY_NAMESPACE, EMBEDDED_URL_CONFIG_KEY, {
			scope: "world",
			config: false,
			type: String,
			default: DEFAULT_EMBEDDED_URL
		});
	}

	const storage = game.settings.storage.get("world");
	const legacyKey = `${LEGACY_NAMESPACE}.${EMBEDDED_URL_CONFIG_KEY}`;
	const currentKey = `${MODULE_NAMESPACE}.${EMBEDDED_URL_CONFIG_KEY}`;
	if (storage?.has(legacyKey) && !storage.has(currentKey)) {
		const legacyValue = game.settings.get(LEGACY_NAMESPACE, EMBEDDED_URL_CONFIG_KEY);
		await game.settings.set(MODULE_NAMESPACE, EMBEDDED_URL_CONFIG_KEY, legacyValue);
	}
}

/**
 * 检测当前 Foundry 版本是否为 v13 或更新版本
 * @returns {boolean}
 */
function isAtLeastV13() {
	const version = game.release?.version ?? game.version ?? "0";
	return foundry.utils.isNewerVersion(version, "12.999");
}

/**
 * 获取侧边栏根节点，兼容 V1 和 V2 UI
 * @returns {HTMLElement | null}
 */
function getSidebarRoot() {
	const sidebar = ui.sidebar;
	if (!sidebar) return null;
	if (sidebar.element instanceof HTMLElement) return sidebar.element;
	if (sidebar.element?.[0] instanceof HTMLElement) return sidebar.element[0];
	if (sidebar._element?.[0] instanceof HTMLElement) return sidebar._element[0];
	return document.getElementById("sidebar");
}

/**
 * 获取侧边栏外层容器（v13 通常是 #ui-right）
 * @param {HTMLElement} [root]
 * @returns {HTMLElement | null}
 */
function getSidebarContainer(root = getSidebarRoot()) {
	if (!root) return null;
	if (root.parentElement?.id === SIDEBAR_CONTAINER_ID) return root.parentElement;
	return document.getElementById(SIDEBAR_CONTAINER_ID);
}

/**
 * 查找侧栏主导航节点
 * @param {HTMLElement} root
 * @returns {HTMLElement | null}
 */
function findPrimaryNav(root) {
	if (!root) return null;
	return (
		root.querySelector("nav[data-tab-group='primary']") ??
		root.querySelector("nav.sidebar-tabs") ??
		root.querySelector("nav[role='tablist']") ??
		root.querySelector("nav")
	);
}

/**
 * 根据 tabId 查找导航按钮
 * @param {string} tabId
 * @param {HTMLElement} [root]
 * @returns {HTMLElement | null}
 */
function findTabButton(tabId, root = getSidebarRoot()) {
	const nav = findPrimaryNav(root);
	if (!nav) return null;
	return nav.querySelector(`[data-tab="${tabId}"]`);
}

/**
 * 获取当前激活标签 ID
 * @param {HTMLElement} [root]
 * @returns {string | null}
 */
function getActiveSidebarTabId(root = getSidebarRoot()) {
	const nav = findPrimaryNav(root);
	const selectedButton = nav?.querySelector?.(
		"[data-tab].active, [data-tab][aria-selected='true'], [data-tab][data-state='active']"
	);
	return (
		selectedButton?.dataset.tab ??
		selectedButton?.getAttribute("data-tab") ??
		ui.sidebar?.activeTab ??
		ui.sidebar?.tabGroups?.primary ??
		null
	);
}

/**
 * 获取模块侧栏面板节点
 * @returns {HTMLElement | null}
 */
function getSidebarPanel() {
	if (sharedPanel instanceof HTMLElement) return sharedPanel;
	const panel = document.getElementById(SIDEBAR_TAB_ID);
	if (panel) sharedPanel = panel;
	return sharedPanel;
}

/**
 * 读取字符串设置，异常时回退默认值
 * @param {string} key
 * @param {string} fallback
 * @returns {string}
 */
function getStringSetting(key, fallback) {
	try {
		const value = game.settings.get(MODULE_NAMESPACE, key);
		if (typeof value !== "string") return fallback;
		const normalized = value.trim();
		return normalized || fallback;
	} catch (_error) {
		return fallback;
	}
}

/**
 * 获取配置后的标签标题
 * @returns {string}
 */
function getTabTitle() {
	return getStringSetting(TAB_TITLE_CONFIG_KEY, DEFAULT_TAB_TITLE);
}

/**
 * 获取配置后的标签图标 classes
 * @returns {string[]}
 */
function getTabIconClasses() {
	const rawIcon = getStringSetting(TAB_ICON_CONFIG_KEY, DEFAULT_TAB_ICON);
	const tokens = rawIcon.split(/\s+/).filter(Boolean);
	if (!tokens.length) return ["fa-solid", DEFAULT_TAB_ICON];

	if (tokens.length === 1) {
		const iconToken = tokens[0];
		if (/^fa-[a-z0-9-]+$/i.test(iconToken) && !ICON_STYLE_CLASSES.has(iconToken)) {
			return ["fa-solid", iconToken];
		}
		return ["fa-solid", DEFAULT_TAB_ICON];
	}

	const hasStyleClass = tokens.some(token => ICON_STYLE_CLASSES.has(token));
	const hasIconClass = tokens.some(token =>
		/^fa-[a-z0-9-]+$/i.test(token) &&
		!ICON_STYLE_CLASSES.has(token) &&
		!ICON_MODIFIER_CLASSES.has(token) &&
		!token.startsWith("fa-rotate-") &&
		!token.startsWith("fa-flip-")
	);
	const result = Array.from(new Set(tokens.filter(token => /^fa-[a-z0-9-]+$/i.test(token))));
	if (!hasStyleClass) result.unshift("fa-solid");
	if (!hasIconClass) result.push(DEFAULT_TAB_ICON);
	return Array.from(new Set(result));
}

/**
 * 同步按钮和面板的显示文本/图标
 * @param {{button?: HTMLElement | null, panel?: HTMLElement | null}} [options]
 */
function updateTabPresentation(options = {}) {
	const {
		button = findTabButton(SIDEBAR_TAB_ID, getSidebarRoot()),
		panel = getSidebarPanel()
	} = options;
	const tabTitle = getTabTitle();
	const tabIconClasses = getTabIconClasses();

	if (button) {
		button.setAttribute("data-tooltip", tabTitle);
		button.setAttribute("aria-label", tabTitle);
		button.title = tabTitle;

		let icon = button.querySelector("i");
		if (!icon) {
			icon = document.createElement("i");
			button.replaceChildren(icon);
		}
		icon.className = "";
		icon.classList.add(...tabIconClasses);
		icon.setAttribute("aria-hidden", "true");
	}

	if (panel) {
		panel.setAttribute("aria-label", tabTitle);
	}

	const popout = window.BoluoChatEmbed?.popoutInstance;
	if (popout?.rendered) {
		popout.options.title = tabTitle;
		const titleElement = popout._element?.[0]?.querySelector(".window-title");
		if (titleElement) titleElement.textContent = tabTitle;
	}
}

/**
 * 判断当前是否激活了模块侧栏标签
 * @param {HTMLElement} [root]
 * @returns {boolean}
 */
function isBoluoTabActive(root = getSidebarRoot()) {
	const selectedTabId = getActiveSidebarTabId(root);

	if (selectedTabId) return selectedTabId === SIDEBAR_TAB_ID;

	const boluoButton = findTabButton(SIDEBAR_TAB_ID, root);
	return (
		boluoButton?.classList.contains("active") ||
		boluoButton?.getAttribute("aria-selected") === "true" ||
		boluoButton?.getAttribute("data-state") === "active"
	);
}

/**
 * 可靠激活侧栏标签，兼容 v10-v13 与主题自定义
 * @param {string} tabId
 * @param {{root?: HTMLElement, defer?: boolean, fallbackClick?: boolean}} [options]
 */
function activateSidebarTab(tabId, options = {}) {
	const {
		root = getSidebarRoot(),
		defer = false,
		fallbackClick = true
	} = options;

	const run = () => {
		const currentRoot = root?.isConnected ? root : getSidebarRoot();
		const button = findTabButton(tabId, currentRoot);
		const group = button?.dataset.group ?? "primary";

		if (typeof ui.sidebar?.activateTab === "function") {
			ui.sidebar.activateTab(tabId);
		} else if (typeof ui.sidebar?.changeTab === "function") {
			ui.sidebar.changeTab(tabId, group, { force: true });
		}

		if (fallbackClick && getActiveSidebarTabId(currentRoot) !== tabId) {
			button?.dispatchEvent(new MouseEvent("click", {
				bubbles: true,
				cancelable: true,
				button: 0
			}));
		}

		requestAnimationFrame(() => syncSidebarWidthState(getSidebarRoot()));
	};

	if (defer) {
		requestAnimationFrame(run);
		return;
	}
	run();
}

/**
 * 根据当前激活标签同步侧边栏宽度状态
 * @param {HTMLElement} [root]
 */
function syncSidebarWidthState(root = getSidebarRoot()) {
	if (!root) return;
	const isCollapsed = Boolean(ui.sidebar?.collapsed) || root.classList.contains("collapsed");
	const shouldWide = isBoluoTabActive(root) && !isCollapsed;
	root.classList.toggle(SIDEBAR_WIDE_CLASS, shouldWide);

	const container = getSidebarContainer(root);
	container?.classList.toggle(SIDEBAR_WIDE_CLASS, shouldWide);
}

/**
 * 绑定侧边栏状态观察器，用于跟踪激活标签与折叠状态变化
 * @param {HTMLElement} root
 */
function ensureSidebarStateObserver(root) {
	if (!root || root.__boluoStateObserver) return;

	const observer = new MutationObserver(() => {
		syncSidebarWidthState(root);
	});
	observer.observe(root, {
		subtree: true,
		attributes: true,
		attributeFilter: ["class", "aria-selected"]
	});

	root.__boluoStateObserver = observer;

	const container = getSidebarContainer(root);
	if (container && !container.__boluoStateObserver) {
		const containerObserver = new MutationObserver(() => {
			syncSidebarWidthState(root);
		});
		containerObserver.observe(container, {
			attributes: true,
			attributeFilter: ["class"]
		});
		container.__boluoStateObserver = containerObserver;
	}
}

/**
 * 获取默认按钮模板元素（聊天按钮）
 * @param {HTMLElement} nav
 * @returns {HTMLElement | null}
 */
function getTemplateButton(nav) {
	return nav?.querySelector(`[data-tab="chat"]`) ?? nav?.querySelector("[data-tab]");
}

/**
 * 创建导航按钮
 * @param {HTMLElement} nav
 * @returns {HTMLElement}
 */
function createTabButton(nav) {
	const template = getTemplateButton(nav);
	const tagName = template?.tagName?.toLowerCase() ?? "a";
	const button = document.createElement(tagName);
	if (template) {
		const baseClasses = Array.from(template.classList || []).filter(cls => !cls.startsWith("fa"));
		button.className = baseClasses.join(" ");
		const group = template.dataset.group ?? template.getAttribute("data-group");
		if (group) {
			button.dataset.group = group;
			button.setAttribute("data-group", group);
		}
		// 某些主题使用 data-action 触发切换，复制保持兼容
		if (template.dataset.action) {
			button.dataset.action = template.dataset.action;
		}
		if (template.getAttribute("role")) {
			button.setAttribute("role", template.getAttribute("role"));
		}
		if (template.getAttribute("type")) {
			button.setAttribute("type", template.getAttribute("type"));
		}
	}
	button.dataset.tab = SIDEBAR_TAB_ID;
	button.setAttribute("data-tab", SIDEBAR_TAB_ID);
	button.dataset.group = button.dataset.group ?? "primary";
	button.setAttribute("data-group", button.dataset.group);
	button.setAttribute("data-tab-group", button.dataset.group);
	button.setAttribute("aria-controls", SIDEBAR_TAB_ID);
	if (!button.getAttribute("role")) button.setAttribute("role", "tab");
	if (button.tagName === "BUTTON" && !button.getAttribute("type")) button.setAttribute("type", "button");
	button.classList.add("boluo-sidebar-button");

	updateTabPresentation({ button });

	button.addEventListener("contextmenu", event => {
		event.preventDefault();
		if (!window.BoluoChatEmbed.popoutInstance) {
			window.BoluoChatEmbed.popoutInstance = new tabWindow();
		}
		window.BoluoChatEmbed.popoutInstance.render(true);
	});
	button.addEventListener("click", () => {
		requestAnimationFrame(() => {
			refreshEmbeddedFrames();
			syncSidebarWidthState();
		});
	});

	return button;
}

/**
 * 查找已存在的聊天面板，用于定位插入位置
 * @param {HTMLElement} root
 * @returns {HTMLElement | null}
 */
function findChatPanel(root) {
	return root?.querySelector?.(`section[data-tab="chat"]`) ?? root?.querySelector?.("#chat");
}

/**
 * 创建或获取模块专属的侧栏内容节点
 * @param {HTMLElement} root
 * @returns {HTMLElement}
 */
function ensureTabPanel(root = getSidebarRoot()) {
	const existing = getSidebarPanel();
	if (existing) {
		if (existing.dataset.detached === "true") {
			return existing;
		}
		if (root && !root.contains(existing)) {
			const container = findChatPanel(root)?.parentElement ?? root;
			container?.appendChild(existing);
		}
		if (!existing.querySelector(`#${SIDEBAR_IFRAME_ID}`)) {
			existing.appendChild(createEmbeddedIframe(SIDEBAR_IFRAME_ID));
		}
		return existing;
	}

	const containerRoot = root ?? getSidebarRoot();
	if (!containerRoot) return null;

	const panel = document.createElement("section");
	panel.id = SIDEBAR_TAB_ID;
	panel.dataset.tab = SIDEBAR_TAB_ID;
	panel.setAttribute("role", "tabpanel");
	panel.setAttribute("aria-label", getTabTitle());
	panel.classList.add("tab", "sidebar-tab", "directory", "flexcol");
	panel.style.border = "none";
	panel.style.width = "100%";
	panel.style.height = "100%";
	if (isAtLeastV13()) {
		panel.style.background = "var(--sidebar-background, var(--color-cool-5-90))";
		panel.style.color = "var(--color-text-primary, #1f2933)";
		panel.style.padding = "0";
	}

	panel.appendChild(createEmbeddedIframe(SIDEBAR_IFRAME_ID));

	const referencePanel = findChatPanel(containerRoot);
	const container = referencePanel?.parentElement ?? containerRoot;
	container?.appendChild(panel);

	sharedPanel = panel;
	return panel;
}

/**
 * 将侧栏面板从原位置移除并返回
 * @returns {HTMLElement | null}
 */
function detachSidebarPanel() {
	const panel = getSidebarPanel();
	if (!panel || panel.dataset.detached === "true") return panel ?? null;
	const parent = panel.parentElement;
	if (!parent) return panel;

	if (!panelPlaceholder) {
		panelPlaceholder = document.createElement("div");
		panelPlaceholder.id = `${SIDEBAR_TAB_ID}-placeholder`;
		panelPlaceholder.style.display = "none";
	}

	panelPlaceholder.__boluoParent = parent;
	parent.insertBefore(panelPlaceholder, panel);
	parent.removeChild(panel);
	panel.dataset.detached = "true";
	return panel;
}

/**
 * 将面板恢复到侧栏
 * @param {HTMLElement} panel
 * @param {HTMLElement} [root]
 */
function restoreSidebarPanel(panel = getSidebarPanel(), root = getSidebarRoot()) {
	if (!panel) return;

	const placeholder = panelPlaceholder;
	const placeholderParent = placeholder?.__boluoParent;
	if (placeholder && placeholderParent?.isConnected) {
		placeholderParent.insertBefore(panel, placeholder);
		placeholder.remove();
		panelPlaceholder = null;
	} else {
		const container = findChatPanel(root)?.parentElement ?? root;
		container?.appendChild(panel);
		if (placeholder?.isConnected) placeholder.remove();
		panelPlaceholder = null;
	}

	delete panel.dataset.detached;
	sharedPanel = panel;
}

/**
 * 确保侧栏按钮与内容节点存在
 * @param {HTMLElement} [root]
 */
function ensureSidebarElements(root = getSidebarRoot()) {
	if (!root) return;

	const nav = findPrimaryNav(root);
	if (!nav) return;
	ensureSidebarStateObserver(root);

	let button = findTabButton(SIDEBAR_TAB_ID, root);
	if (!button) {
		button = createTabButton(nav);
		const template = getTemplateButton(nav);
		if (template?.nextSibling) {
			template.after(button);
		} else {
			nav.appendChild(button);
		}
	}

	const panel = ensureTabPanel(root);
	if (!panel) return;
	updateTabPresentation({ button, panel });
	const groupValue = button.dataset.group ?? "primary";
	panel.dataset.group = groupValue;
	panel.setAttribute("data-group", groupValue);
	panel.setAttribute("data-tab-group", groupValue);

	refreshEmbeddedFrames();
	syncSidebarWidthState(root);
}

/**
 * 获取解码后的嵌入地址
 * 说明：浏览器环境无法真正覆写 iframe 的 UA，这里通过 URL 参数触发移动端分支
 * @param {{mobileMode?: boolean}} [options]
 * @returns {string}
 */
function getEmbeddedUrl(options = {}) {
	const { mobileMode = false } = options;
	let rawUrl = "";
	try {
		rawUrl = game.settings.get(MODULE_NAMESPACE, EMBEDDED_URL_CONFIG_KEY);
	} catch (error) {
		console.warn(`[${MODULE_NAMESPACE}] 读取设置失败，使用默认地址。`, error);
	}

	if ((!rawUrl || rawUrl === "undefined") && game.settings.settings.has(`${LEGACY_NAMESPACE}.${EMBEDDED_URL_CONFIG_KEY}`)) {
		rawUrl = game.settings.get(LEGACY_NAMESPACE, EMBEDDED_URL_CONFIG_KEY);
	}

	if (!rawUrl) rawUrl = DEFAULT_EMBEDDED_URL;
	const baseUrl = decodeURIComponent(rawUrl);
	if (!mobileMode) return baseUrl;

	try {
		const parsedUrl = new URL(baseUrl, window.location.origin);
		parsedUrl.searchParams.set(MOBILE_MODE_PARAM_KEY, "1");
		return parsedUrl.toString();
	} catch (_error) {
		const separator = baseUrl.includes("?") ? "&" : "?";
		return `${baseUrl}${separator}${MOBILE_MODE_PARAM_KEY}=1`;
	}
}

/**
 * 切换 iframe 的加载态样式，避免重载期间出现白屏闪烁
 * @param {HTMLIFrameElement} iframe
 * @param {boolean} isLoading
 */
function setIframeLoadingState(iframe, isLoading) {
	if (!iframe) return;
	iframe.classList.add(EMBED_IFRAME_CLASS);
	iframe.classList.toggle(EMBED_IFRAME_READY_CLASS, !isLoading);
}

/**
 * 创建 iframe 节点，保持 Foundry UI 样式一致
 * @param {string} elementId
 * @returns {HTMLIFrameElement}
 */
function createEmbeddedIframe(elementId) {
	const iframe = document.createElement("iframe");
	iframe.id = elementId;
	iframe.style.border = "none";
	iframe.style.width = "100%";
	iframe.style.height = "100%";
	iframe.setAttribute("loading", "lazy");
	iframe.allowFullscreen = true;
	const allowFeatures = [
		"accelerometer",
		"autoplay",
		"camera",
		"clipboard-read",
		"clipboard-write",
		"encrypted-media",
		"fullscreen",
		"geolocation",
		"microphone",
		"storage-access-by-user-activation"
	].join("; ");
	iframe.setAttribute("allow", allowFeatures);
	iframe.referrerPolicy = "strict-origin-when-cross-origin";
	iframe.setAttribute("allowtransparency", "true");
	setIframeLoadingState(iframe, true);
	iframe.addEventListener("load", () => {
		setIframeLoadingState(iframe, false);
	});
	return iframe;
}

/**
 * 同步刷新侧栏与弹窗 iframe 地址
 * 仅在首次加载、设置地址变更时重载，避免切换标签或弹窗开关导致白屏刷新
 * @param {{mobileMode?: boolean, forceReload?: boolean}} [options]
 */
function refreshEmbeddedFrames(options = {}) {
	const {
		mobileMode = true,
		forceReload = false
	} = options;
	const panel = getSidebarPanel();
	const iframe =
		panel?.querySelector?.(`#${SIDEBAR_IFRAME_ID}`) ?? document.getElementById(SIDEBAR_IFRAME_ID);
	if (!iframe) return;

	const baseUrl = getEmbeddedUrl({ mobileMode: false });
	const targetUrl = getEmbeddedUrl({ mobileMode });
	const isFirstLoad = !iframe.getAttribute("src");
	const baseUrlChanged = iframe.dataset.boluoBaseUrl !== baseUrl;
	const shouldReload = forceReload || isFirstLoad || baseUrlChanged;

	if (shouldReload && iframe.getAttribute("src") !== targetUrl) {
		setIframeLoadingState(iframe, true);
		iframe.src = targetUrl;
	}

	if (shouldReload) {
		iframe.dataset.boluoMobileSession = mobileMode ? "true" : "false";
	}
	iframe.dataset.boluoBaseUrl = baseUrl;
	iframe.dataset.boluoMobileUa = mobileMode ? "true" : "false";
}

Hooks.once("init", async () => {
	await registerSettings();

	window.BoluoChatEmbed = Object.assign(window.BoluoChatEmbed ?? {}, {
		getEmbeddedUrl,
		refreshEmbeddedFrames,
		getSidebarRoot,
		findTabButton,
		ensureSidebarElements,
		activateSidebarTab,
		syncSidebarWidthState,
		detachSidebarPanel,
		restoreSidebarPanel,
		getSidebarPanel,
		getTabTitle
	});
});

Hooks.once("ready", async () => {
	// 首次渲染侧栏元素
	ensureSidebarElements();

	// 侧栏重新渲染时补齐元素（v13 会频繁重建 DOM）
	Hooks.on("renderSidebar", (_, element) => {
		const domElement =
			element instanceof HTMLElement ? element :
			element?.[0] instanceof HTMLElement ? element[0] :
			getSidebarRoot();
		ensureSidebarElements(domElement);
	});

	Hooks.on("collapseSidebar", () => {
		syncSidebarWidthState();
	});
});
