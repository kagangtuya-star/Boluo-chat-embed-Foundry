import { tabWindow } from "./tabWindow.js";

const cNoteIcon = "fa-lemon";
const MODULE_NAMESPACE = "Boluo-chat-embed";
const LEGACY_NAMESPACE = "embedded-webpage";
const CONFIG_KEY = "embeddedUrl";
const SIDEBAR_TAB_ID = "boluo-chat";
const SIDEBAR_IFRAME_ID = "boluo-chat-sidebar-iframe";
const SIDEBAR_ARIA_LABEL = "菠萝聊天";
const SIDEBAR_WIDE_CLASS = "boluo-sidebar-wide";
const SIDEBAR_CONTAINER_ID = "ui-right";
const MOBILE_MODE_PARAM_KEY = "mobile";

let sharedPanel = null;
let panelPlaceholder = null;

/**
 * 注册模块设置，并兼容历史命名空间
 */
async function registerSettings() {
	game.settings.register(MODULE_NAMESPACE, CONFIG_KEY, {
		name: "嵌入网页地址（菠萝频道）",
		hint: "请输入要嵌入到右侧选项卡中的网页地址。",
		scope: "world",
		config: true,
		type: String,
		default: "https://app.boluo.chat/zh-CN",
		onChange: () => refreshEmbeddedFrames()
	});

	if (!game.settings.settings.has(`${LEGACY_NAMESPACE}.${CONFIG_KEY}`)) {
		game.settings.register(LEGACY_NAMESPACE, CONFIG_KEY, {
			scope: "world",
			config: false,
			type: String,
			default: "https://app.boluo.chat/zh-CN"
		});
	}

	const storage = game.settings.storage.get("world");
	const legacyKey = `${LEGACY_NAMESPACE}.${CONFIG_KEY}`;
	const currentKey = `${MODULE_NAMESPACE}.${CONFIG_KEY}`;
	if (storage?.has(legacyKey) && !storage.has(currentKey)) {
		const legacyValue = game.settings.get(LEGACY_NAMESPACE, CONFIG_KEY);
		await game.settings.set(MODULE_NAMESPACE, CONFIG_KEY, legacyValue);
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
 * 判断当前是否激活了模块侧栏标签
 * @param {HTMLElement} [root]
 * @returns {boolean}
 */
function isBoluoTabActive(root = getSidebarRoot()) {
	const nav = findPrimaryNav(root);
	const selectedButton = nav?.querySelector?.(
		"[data-tab].active, [data-tab][aria-selected='true'], [data-tab][data-state='active']"
	);

	const selectedTabId =
		selectedButton?.dataset.tab ??
		selectedButton?.getAttribute("data-tab") ??
		ui.sidebar?.activeTab ??
		ui.sidebar?.tabGroups?.primary;

	if (selectedTabId) return selectedTabId === SIDEBAR_TAB_ID;

	const boluoButton = findTabButton(SIDEBAR_TAB_ID, root);
	return (
		boluoButton?.classList.contains("active") ||
		boluoButton?.getAttribute("aria-selected") === "true" ||
		boluoButton?.getAttribute("data-state") === "active"
	);
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

	refreshEmbeddedFrames({ mobileMode: shouldWide });
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
	button.setAttribute("data-tooltip", SIDEBAR_ARIA_LABEL);
	button.title = SIDEBAR_ARIA_LABEL;
	if (!button.getAttribute("role")) button.setAttribute("role", "tab");
	if (button.tagName === "BUTTON" && !button.getAttribute("type")) button.setAttribute("type", "button");
	button.classList.add("boluo-sidebar-button");

	button.replaceChildren();
	const icon = document.createElement("i");
	icon.classList.add("fa-solid", cNoteIcon);
	icon.setAttribute("aria-hidden", "true");
	button.appendChild(icon);

	button.addEventListener("contextmenu", event => {
		event.preventDefault();
		if (!window.BoluoChatEmbed.popoutInstance) {
			window.BoluoChatEmbed.popoutInstance = new tabWindow();
		}
		window.BoluoChatEmbed.popoutInstance.render(true);
	});
	button.addEventListener("click", () => {
		requestAnimationFrame(() => syncSidebarWidthState());
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
	panel.setAttribute("aria-label", SIDEBAR_ARIA_LABEL);
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
		rawUrl = game.settings.get(MODULE_NAMESPACE, CONFIG_KEY);
	} catch (error) {
		console.warn(`[${MODULE_NAMESPACE}] 读取设置失败，使用默认地址。`, error);
	}

	if ((!rawUrl || rawUrl === "undefined") && game.settings.settings.has(`${LEGACY_NAMESPACE}.${CONFIG_KEY}`)) {
		rawUrl = game.settings.get(LEGACY_NAMESPACE, CONFIG_KEY);
	}

	if (!rawUrl) rawUrl = "https://app.boluo.chat/zh-CN";
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
	return iframe;
}

/**
 * 同步刷新侧栏与弹窗 iframe 地址
 * 仅在首次加载、设置地址变更或首次切换到移动端模式时重载，避免频繁白屏刷新
 * @param {{mobileMode?: boolean, forceReload?: boolean}} [options]
 */
function refreshEmbeddedFrames(options = {}) {
	const {
		mobileMode = isBoluoTabActive(getSidebarRoot()),
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
	const needsMobileUpgrade = mobileMode && iframe.dataset.boluoMobileSession !== "true";
	const shouldReload = forceReload || isFirstLoad || baseUrlChanged || needsMobileUpgrade;

	if (shouldReload && iframe.getAttribute("src") !== targetUrl) {
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
		syncSidebarWidthState,
		detachSidebarPanel,
		restoreSidebarPanel,
		getSidebarPanel
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
