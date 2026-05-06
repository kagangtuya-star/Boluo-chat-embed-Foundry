import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../scripts/MainUI.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../styles/module.css", import.meta.url), "utf8");

test("MainUI registers dialogue settings", () => {
	assert.match(source, /dialogueEnabled/);
	assert.match(source, /dialogueTypeSpeed/);
	assert.match(source, /dialogueFontSize/);
	assert.match(source, /dialogueWaitSeconds/);
	assert.match(source, /dialogueThemeColor/);
});

test("MainUI creates handshake and unsubscribe flow", () => {
	assert.match(source, /createHandshakeMessage/);
	assert.match(source, /createUnsubscribeMessage/);
	assert.match(source, /postMessage\(createHandshakeMessage\(\), "\*"\)/);
	assert.match(source, /postMessage\(createUnsubscribeMessage\(\), "\*"\)/);
});

test("MainUI ignores non-bridge or non-owner messages", () => {
	assert.match(source, /event\.source !== iframe\?\.contentWindow/);
	assert.match(source, /data\.type\.startsWith\("sealchat\.bridge\."\)/);
});

test("MainUI syncs sidebar width from native v13 sidebar content metrics", () => {
	assert.match(source, /sidebar-content/);
	assert.match(source, /--sidebar-width/);
	assert.match(source, /uiScale/);
	assert.match(source, /transitionend/);
	assert.match(source, /sidebarContent\?\.classList\.toggle\(SIDEBAR_WIDE_CLASS, shouldWide\)/);
});

test("MainUI registers sidebar width and embed scale settings", () => {
	assert.match(source, /SIDEBAR_MIN_WIDTH_CONFIG_KEY/);
	assert.match(source, /SIDEBAR_PREFERRED_WIDTH_CONFIG_KEY/);
	assert.match(source, /SIDEBAR_EMBED_SCALE_CONFIG_KEY/);
	assert.match(source, /sidebarMinWidth/);
	assert.match(source, /sidebarPreferredWidth/);
	assert.match(source, /sidebarEmbedScale/);
	assert.match(source, /game\.settings\.register\(MODULE_NAMESPACE, SIDEBAR_EMBED_SCALE_CONFIG_KEY,[\s\S]*?onChange: \(\) => syncSidebarWidthState\(\)/);
});

test("MainUI creates sidebar embed viewport and syncs scale variables", () => {
	assert.match(source, /boluo-embed-viewport/);
	assert.match(source, /--boluo-embed-scale/);
	assert.match(source, /--boluo-embed-inverse-scale/);
});

test("Sidebar embed iframe opts out of flex growth when scaled", () => {
	assert.match(styles, /boluo-embed-viewport > iframe\.boluo-chat-iframe[^}]*flex: 0 0 auto/);
});

test("Sidebar embed viewport allows scrolling for enlarged content", () => {
	assert.match(styles, /boluo-embed-viewport[^}]*overflow: auto/);
});

test("MainUI removes temporary sidebar diagnostics after fix is settled", () => {
	assert.doesNotMatch(source, /sidebar diagnostics/);
	assert.doesNotMatch(source, /sidebar summary/);
	assert.doesNotMatch(source, /iframe diagnostics/);
	assert.doesNotMatch(source, /iframe summary/);
	assert.doesNotMatch(source, /console\.debug/);
});

test("MainUI defaults sidebar iframe to desktop mode while popout keeps mobile mode", () => {
	assert.match(source, /function refreshEmbeddedFrames\(options = \{\}\) \{[\s\S]*mobileMode = false/);
});

test("MainUI reloads sidebar iframe when mobile session mode changes", () => {
	assert.match(source, /iframe\.dataset\.boluoMobileSession/);
	assert.match(source, /mobileSessionChanged/);
	assert.match(source, /shouldReload = forceReload \|\| isFirstLoad \|\| baseUrlChanged \|\| mobileSessionChanged/);
});

test("MainUI keeps sidebar panel insertion immediately after native chat panel", () => {
	assert.match(source, /referencePanel\.after\(panel\)/);
	assert.match(source, /insertSidebarPanel\(panel, containerRoot, referencePanel\)/);
});

test("MainUI clones chat panel layout as template for custom sidebar tab", () => {
	assert.match(source, /document\.createElement\("section"\)/);
	assert.match(source, /panel\.dataset\.tab = SIDEBAR_TAB_ID/);
	assert.match(source, /panel\.classList\.add\("tab", "sidebar-tab", "flexcol", "boluo-sidebar-panel"\)/);
});
