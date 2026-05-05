import test from "node:test";
import assert from "node:assert/strict";
import { calculateSidebarTargetWidth } from "../scripts/sidebarWidth.mjs";

test("calculateSidebarTargetWidth adds horizontal chrome width to preferred sidebar width", () => {
	assert.equal(
		calculateSidebarTargetWidth({
			currentWidth: 320,
			preferredWidth: 400,
			minUsefulWidth: 360,
			viewportWidth: 1440,
			horizontalChromeWidth: 12
		}),
		412
	);
});

test("calculateSidebarTargetWidth still respects viewport safe gutter after chrome adjustment", () => {
	assert.equal(
		calculateSidebarTargetWidth({
			currentWidth: 320,
			preferredWidth: 400,
			minUsefulWidth: 360,
			viewportWidth: 450,
			safeViewportGutter: 96,
			horizontalChromeWidth: 24
		}),
		354
	);
});

test("calculateSidebarTargetWidth converts transformed chrome width back to logical width using uiScale", () => {
	assert.equal(
		calculateSidebarTargetWidth({
			currentWidth: 320,
			preferredWidth: 400,
			minUsefulWidth: 360,
			viewportWidth: 1440,
			horizontalChromeWidth: 12,
			uiScale: 0.8
		}),
		415
	);
});

test("calculateSidebarTargetWidth uses wider default preferred width for v13 sidebar embeds", () => {
	assert.equal(
		calculateSidebarTargetWidth({
			currentWidth: 336,
			viewportWidth: 1440,
			horizontalChromeWidth: 34.2,
			uiScale: 0.95
		}),
		456
	);
});
