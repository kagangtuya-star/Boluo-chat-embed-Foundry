import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../scripts/MainUI.js", import.meta.url), "utf8");

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
