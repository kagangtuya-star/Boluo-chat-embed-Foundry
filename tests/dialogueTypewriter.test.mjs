import test from "node:test";
import assert from "node:assert/strict";
import { countVisibleCharacters, sliceHtmlByVisibleCharacters } from "../scripts/dialogue/typewriter.mjs";

test("countVisibleCharacters ignores tags and counts entities once", () => {
	assert.equal(countVisibleCharacters("<b>A</b>&amp;"), 2);
});

test("sliceHtmlByVisibleCharacters keeps tags intact", () => {
	assert.equal(sliceHtmlByVisibleCharacters("<b>AB</b>", 1), "<b>A");
});
