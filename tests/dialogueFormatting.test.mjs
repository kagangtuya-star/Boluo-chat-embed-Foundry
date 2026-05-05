import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDialoguePages } from "../scripts/dialogue/formatting.mjs";

test("normalizeDialoguePages splits :: and restores line breaks", () => {
	assert.deepEqual(normalizeDialoguePages("A::B\\nC"), ["A", "B<br>C"]);
});

test("normalizeDialoguePages restores tab escapes and keeps empty string safe", () => {
	assert.deepEqual(normalizeDialoguePages("A\\tB::"), ["A&emsp;&emsp;B", ""]);
	assert.deepEqual(normalizeDialoguePages(""), [""]);
});
