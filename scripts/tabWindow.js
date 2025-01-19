// import { cModuleName, Translate } from "../utils/utils.js";
// https://github.com/Saibot393/notebook/blob/2a6052267ea81d72fbd304b7a08a2e7b70d6182a/scripts/helpers/tabWindow.js
export class tabWindow extends Application {
    constructor(pOptions = {}) {
        super(pOptions);

        this._tabHTML = document.querySelector(`.tab[id="boluo-chat"]`);
    }

    get header() {
        return this._element[0].querySelector("header");
    }

    get body() {
        return this._element[0].querySelector("div.content");
    }

    //app stuff
    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            classes: ["sidebar-popout"],
            id: "notebook-popout",
            popOut: true,
            width: 360,
            height: 700,
            template: `modules/notebook/templates/default.html`,
            jQuery: true,
            title: "菠萝聊天",
            resizable: true
        }
    }

    async _render(pforce = false, pOptions = {}) {
        await super._render(pforce, pOptions);

        this.body.appendChild(this._tabHTML);

        ui.sidebar._element[0].querySelector("nav").querySelector(`[data-tab="boluo-chat"]`).style.display = "none";

        ui.sidebar.activateTab("chat")
    }

    close() {
        ui.sidebar._element[0].appendChild(this._tabHTML);

        ui.sidebar._element[0].querySelector("nav").querySelector(`[data-tab="boluo-chat"]`).style.display = "";

        ui.sidebar.activateTab("boluo-chat")

        super.close();
    }
}