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
