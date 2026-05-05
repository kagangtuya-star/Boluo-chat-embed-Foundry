import test from "node:test";
import assert from "node:assert/strict";
import {
	DIALOGUE_WORLD_DEFAULTS,
	DIALOGUE_CLIENT_DEFAULTS,
	normalizeDialogueClientSettings
} from "../scripts/dialogue/settings.mjs";

test("settings expose expected defaults", () => {
	assert.equal(DIALOGUE_WORLD_DEFAULTS.dialogueEnabled, false);
	assert.equal(DIALOGUE_WORLD_DEFAULTS.dialogueTypeSpeed, 50);
	assert.equal(DIALOGUE_WORLD_DEFAULTS.dialogueFontSize, 24);
	assert.equal(DIALOGUE_WORLD_DEFAULTS.dialogueWaitSeconds, 4);
	assert.equal(DIALOGUE_WORLD_DEFAULTS.dialogueThemeColor, "#0e0f10");
	assert.equal(DIALOGUE_CLIENT_DEFAULTS.dialogueWidth, 640);
	assert.equal(DIALOGUE_CLIENT_DEFAULTS.dialogueCollapsedWidth, 48);
	assert.equal(DIALOGUE_CLIENT_DEFAULTS.dialogueCollapsedHeight, 48);
});

test("normalizeDialogueClientSettings rounds numeric values and keeps booleans", () => {
	const result = normalizeDialogueClientSettings({
		dialogueWidth: 639.6,
		dialogueTop: 55.5,
		dialogueCollapsed: true
	});

	assert.equal(result.dialogueWidth, 640);
	assert.equal(result.dialogueTop, 56);
	assert.equal(result.dialogueCollapsed, true);
});
