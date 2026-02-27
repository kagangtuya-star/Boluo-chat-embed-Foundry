// import { cModuleName, Translate } from "../utils/utils.js";
// https://github.com/Saibot393/notebook/blob/2a6052267ea81d72fbd304b7a08a2e7b70d6182a/scripts/helpers/tabWindow.js
const SIDEBAR_TAB_ID = "boluo-chat";

export class tabWindow extends Application {
	constructor(pOptions = {}) {
		super(pOptions);
		this._panel = null;
	}

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

		const detach = window.BoluoChatEmbed?.detachSidebarPanel;
		this._panel = detach ? detach() : null;
		if (this._panel) {
			this._panel.classList.add("boluo-chat-popout-panel");
			this._panel.style.flex = "1 1 auto";
			this._panel.style.height = "100%";
			this._panel.style.width = "100%";
			this.body.replaceChildren(this._panel);
		} else {
			this.body.innerHTML = "";
		}

		window.BoluoChatEmbed?.refreshEmbeddedFrames?.();

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

		if (this._panel) {
			this._panel.classList.remove("boluo-chat-popout-panel");
			window.BoluoChatEmbed?.restoreSidebarPanel?.(this._panel);
			this._panel = null;
		}

		window.BoluoChatEmbed?.refreshEmbeddedFrames?.();
		window.BoluoChatEmbed?.ensureSidebarElements?.();

		return super.close(options);
	}
}
