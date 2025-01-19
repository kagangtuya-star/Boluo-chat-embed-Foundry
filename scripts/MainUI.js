import { tabWindow } from "./tabWindow.js";

const cNoteIcon = "fa-lemon";
const MODULE_NAME = "embedded-webpage";
const CONFIG_KEY = "embeddedUrl";

Hooks.once("ready", async () => {
	// 注册网页地址配置项
	game.settings.register(MODULE_NAME, CONFIG_KEY, {
		name: "嵌入网页地址（菠萝频道）",
		hint: "请输入要嵌入到右侧选项卡中的网页地址。",
		scope: "world",
		config: true,
		type: String,
		default: "https://app.boluo.chat/zh-CN",
		onChange: value => {
			// 不做任何编码，直接保存
			game.settings.set(MODULE_NAME, CONFIG_KEY, value);
		}
	});

	// 创建选项卡按钮
	let vSidebar = ui.sidebar._element[0];
	let vBoLuoTabButton = document.createElement("a");
	vBoLuoTabButton.classList.add("item");
	vBoLuoTabButton.setAttribute("data-tab", "boluo-chat");
	vBoLuoTabButton.setAttribute("aria-controls", "菠萝聊天");

	vBoLuoTabButton.setAttribute("role", "tab");
	vBoLuoTabButton.oncontextmenu = () => { new tabWindow().render(true) }
	// 添加图标
	let vNoteIcon = document.createElement("i");
	vNoteIcon.classList.add("fa-solid", cNoteIcon);
	vBoLuoTabButton.appendChild(vNoteIcon);

	// 插入按钮到导航栏
	vSidebar.querySelector("nav").querySelector(`[data-tab="chat"]`).after(vBoLuoTabButton);

	// 创建并初始化选项卡内容
	// 获取并解码URL
	const rawUrl = game.settings.get(MODULE_NAME, CONFIG_KEY);
	// 如果需要可在使用时 decode
	const embeddedUrl = decodeURIComponent(rawUrl);
	// 使用embeddedUrl进行后续操作
	let vBoLuoTab = document.createElement("section");
	vBoLuoTab.classList.add("tab", "sidebar-tab", "chat-sidebar", "directory", "flexcol");
	vBoLuoTab.setAttribute("id", "boluo-chat");
	vBoLuoTab.setAttribute("data-tab", "boluo-chat");
	vBoLuoTab.setAttribute("aria-controls", "菠萝聊天");
	// 添加style 
	vBoLuoTab.setAttribute("style", "border: none; width: 100% !important; height: 100% !important;");
	new Notes({ tab: vBoLuoTab });
	vSidebar.appendChild(vBoLuoTab);

});

class Notes extends SidebarTab {
	constructor(options) {
		super(options);
		const embeddedUrl = game.settings.get(MODULE_NAME, CONFIG_KEY);

		// 创建iframe
		const iframe = document.createElement("iframe");
		iframe.src = embeddedUrl;
		iframe.style.border = "none";
		iframe.style.width = "100%";
		iframe.style.height = "100%";
		iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
		// this.options.tab.empty();
		this.options.tab.append(iframe);
	}

	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			id: "boluo-chat",
			template: null,
			title: "嵌入网页"
		});
	}
}

// 监听渲染事件以更新iframe地址
Hooks.on("renderSidebarTab", async (app, html, data) => {
	if (app instanceof Notes) {
		const iframe = app.element.find("iframe")[0];
		if (iframe) iframe.src = game.settings.get(MODULE_NAME, CONFIG_KEY);
	}
});