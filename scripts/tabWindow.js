// import { cModuleName, Translate } from "../utils/utils.js";
// https://github.com/Saibot393/notebook/blob/2a6052267ea81d72fbd304b7a08a2e7b70d6182a/scripts/helpers/tabWindow.js
const SIDEBAR_TAB_ID = "boluo-chat";
const POPOUT_IFRAME_ID = "boluo-chat-popout-iframe";

function createPopoutIframe(src) {
	const iframe = document.createElement("iframe");
	iframe.id = POPOUT_IFRAME_ID;
	iframe.style.border = "none";
	iframe.style.width = "100%";
	iframe.style.height = "100%";
	iframe.setAttribute("loading", "lazy");
	iframe.allowFullscreen = true;
	iframe.referrerPolicy = "strict-origin-when-cross-origin";
	iframe.setAttribute("allowtransparency", "true");
	iframe.setAttribute(
		"allow",
		"accelerometer; autoplay; camera; clipboard-read; clipboard-write; encrypted-media; fullscreen; geolocation; microphone; storage-access-by-user-activation"
	);
	iframe.src = src;
	return iframe;
}

export class tabWindow extends Application {
	get header() {
		return this._element[0].querySelector("header");
	}

	get body() {
		return this._element[0].querySelector("div.content");
	}

	// app 配置
	static get defaultOptions() {
		return {
			...super.defaultOptions,
			classes: ["sidebar-popout"],
			id: "boluo-chat-popout",
			popOut: true,
			width: 360,
			height: 700,
			template: `modules/Boluo-chat-embed/templates/default.html`,
			jQuery: true,
			title: "菠萝聊天",
			resizable: true
		};
	}

	async _render(pforce = false, pOptions = {}) {
		await super._render(pforce, pOptions);

		window.BoluoChatEmbed?.ensureSidebarElements?.();
		const popoutSrc =
			window.BoluoChatEmbed?.getEmbeddedUrl?.({ mobileMode: true }) ??
			"https://app.boluo.chat/zh-CN";
		this.body.replaceChildren(createPopoutIframe(popoutSrc));

		const navItem =
			window.BoluoChatEmbed?.findTabButton?.(SIDEBAR_TAB_ID) ??
			window.BoluoChatEmbed?.getSidebarRoot?.()?.querySelector?.(`[data-tab="${SIDEBAR_TAB_ID}"]`);
		if (navItem) navItem.style.display = "none";
		if (typeof ui.sidebar.activateTab === "function") {
			ui.sidebar.activateTab("chat");
		} else if (typeof ui.sidebar.changeTab === "function") {
			ui.sidebar.changeTab("chat", "primary", { force: true });
		}
		window.BoluoChatEmbed?.syncSidebarWidthState?.();
	}

	async close(options = {}) {
		const navItem =
			window.BoluoChatEmbed?.findTabButton?.(SIDEBAR_TAB_ID) ??
			window.BoluoChatEmbed?.getSidebarRoot?.()?.querySelector?.(`[data-tab="${SIDEBAR_TAB_ID}"]`);
		if (navItem) navItem.style.display = "";
		if (typeof ui.sidebar.activateTab === "function") {
			ui.sidebar.activateTab(SIDEBAR_TAB_ID);
		} else if (typeof ui.sidebar.changeTab === "function") {
			ui.sidebar.changeTab(SIDEBAR_TAB_ID, "primary", { force: true });
		}
		window.BoluoChatEmbed?.syncSidebarWidthState?.();

		window.BoluoChatEmbed?.ensureSidebarElements?.();

		return super.close(options);
	}
}
