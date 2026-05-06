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

test("calculateSidebarTargetWidth still respects default min width when preferred width is lower", () => {
	assert.equal(
		calculateSidebarTargetWidth({
			currentWidth: 336,
			viewportWidth: 1440,
			horizontalChromeWidth: 34.2,
			uiScale: 0.95
		}),
		396
	);
});

test("calculateSidebarTargetWidth honors caller supplied minUsefulWidth", () => {
	assert.equal(
		calculateSidebarTargetWidth({
			currentWidth: 280,
			preferredWidth: 320,
			minUsefulWidth: 520,
			viewportWidth: 1440,
			horizontalChromeWidth: 0
		}),
		520
	);
});

test("calculateSidebarTargetWidth ignores embed content scale when sidebar width should stay fixed", () => {
	assert.equal(
		calculateSidebarTargetWidth({
			currentWidth: 320,
			preferredWidth: 420,
			minUsefulWidth: 360,
			viewportWidth: 1440,
			horizontalChromeWidth: 12,
			contentScale: 1.2
		}),
		432
	);
});

test("calculateSidebarTargetWidth honors caller supplied preferredWidth", () => {
	assert.equal(
		calculateSidebarTargetWidth({
			currentWidth: 280,
			preferredWidth: 500,
			minUsefulWidth: 360,
			viewportWidth: 1440,
			horizontalChromeWidth: 12
		}),
		512
	);
});
