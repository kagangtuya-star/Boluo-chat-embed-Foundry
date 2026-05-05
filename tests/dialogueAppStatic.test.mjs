import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../scripts/dialogue/app.mjs", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../styles/module.css", import.meta.url), "utf8");

test("dialogue app exposes minimize and fast-forward buttons", () => {
	assert.match(appSource, /dialogue-fast-forward/);
	assert.match(appSource, /dialogue-minimize/);
	assert.match(appSource, /dialogue-drag-handle/);
	assert.match(appSource, /page-indicator/);
	assert.match(appSource, /tabIcon/);
});

test("dialogue app subscribes to dialogue store and restarts playback on queue change", () => {
	assert.match(appSource, /dialogueStore\.subscribe/);
	assert.match(appSource, /restartPlayback/);
	assert.match(appSource, /applyQueueEvent/);
	assert.match(appSource, /bindResizeHandles/);
	assert.match(appSource, /bindDragHandle/);
	assert.match(appSource, /dialogueWaitSeconds/);
	assert.match(appSource, /dialogueThemeColor/);
	assert.match(appSource, /getPlaybackSettingsKey/);
	assert.match(appSource, /getWindowSettingsKey/);
	assert.match(appSource, /element\.style\.minWidth/);
	assert.match(appSource, /element\.style\.minHeight/);
	assert.match(appSource, /activateListeners\(html\)[\s\S]*syncWindowGeometryFromSettings\(\)/);
	assert.match(appSource, /suppressCollapsedClick/);
	assert.match(appSource, /application\.position\s*=\s*\{/);
});

test("module css defines boluo dialogue shell and resize handles", () => {
	assert.match(styleSource, /\.boluo-dialogue-card/);
	assert.match(styleSource, /\.boluo-dialogue-resize-edge/);
	assert.match(styleSource, /\.boluo-dialogue-collapsed-tab/);
	assert.match(styleSource, /\.application\.boluo-dialogue-window[\s\S]*background:\s*transparent/);
	assert.match(styleSource, /\.application\.boluo-dialogue-window[\s\S]*box-shadow:\s*none/);
	assert.match(styleSource, /#boluo-dialogue-window \.window-header\s*\{/);
	assert.match(styleSource, /#boluo-dialogue-window \.window-content[\s\S]*height:\s*100%/);
	assert.match(styleSource, /\.boluo-dialogue-portrait-frame\s*\{[\s\S]*var\(--boluo-dialogue-theme-color/);
	assert.match(styleSource, /\.boluo-dialogue-window-button\s*\{[\s\S]*z-index:\s*3/);
	assert.match(styleSource, /\.boluo-dialogue-drag-handle\s*\{[\s\S]*z-index:\s*1/);
	assert.match(styleSource, /#boluo-dialogue-window \.window-resizable-handle\s*\{[\s\S]*display:\s*none/);
	assert.match(styleSource, /\.boluo-dialogue-collapsed-tab\s*\{[\s\S]*width:\s*48px/);
	assert.match(styleSource, /\.boluo-dialogue-collapsed-tab\s*\{[\s\S]*height:\s*48px/);
});

test("dialogue app defers scroll syncing until next frame for typewriter overflow", () => {
	assert.match(appSource, /requestAnimationFrame/);
	assert.match(appSource, /cancelAnimationFrame/);
	assert.match(appSource, /viewport\.scrollTop\s*=\s*viewport\.scrollHeight/);
	assert.match(styleSource, /\.boluo-dialogue-right-column\s*\{[\s\S]*display:\s*flex/);
	assert.match(styleSource, /\.boluo-dialogue-copy-stage\s*\{[\s\S]*flex:\s*1 1 auto/);
	assert.match(styleSource, /\.boluo-dialogue-copy-viewport\s*\{[\s\S]*flex:\s*1 1 auto/);
	assert.match(styleSource, /\.boluo-dialogue-portrait-frame\s*\{[\s\S]*flex:\s*1 1 auto/);
	assert.match(styleSource, /scrollbar-color:\s*var\(--boluo-dialogue-name-color/);
	assert.match(styleSource, /::-webkit-scrollbar-thumb[\s\S]*var\(--boluo-dialogue-name-color/);
	assert.match(styleSource, /::-webkit-scrollbar-track[\s\S]*transparent/);
});
