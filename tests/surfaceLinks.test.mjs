import test from "node:test";
import assert from "node:assert/strict";
import { SURFACE_TYPES, parseSurfaceLink, applyTheaterOptions, createTheaterLink, readChannelContext } from "../scripts/surfaces/links.mjs";
import { resizeFloatingRect } from "../scripts/floatingWindow.mjs";

const link = (type, id = "resource") => `https://chat.example/sub/?theme=dark#/internal/${type}/${id}?world=world&channel=channel`;

test("all six Internal Surface types preserve resource identity and deployment base", () => {
	for (const type of Object.keys(SURFACE_TYPES)) {
		const surface = parseSurfaceLink(link(type, type === "theater" ? "world" : "resource"));
		assert.equal(surface.key, `${type}:${surface.id}:world:channel`);
		assert.equal(surface.url.pathname, "/sub/");
		assert.equal(surface.url.searchParams.get("theme"), "dark");
	}
});

test("theater defaults to transparent presentation and options do not alter identity", () => {
	const raw = link("theater", "world") + "&transparent=0&full=1&extra=keep";
	const result = applyTheaterOptions(raw);
	assert.match(result, /transparent=1/);
	assert.match(result, /full=0/);
	assert.match(result, /extra=keep/);
	assert.equal(parseSurfaceLink(result).key, parseSurfaceLink(raw).key);
	const full = applyTheaterOptions(result, { transparent: false, full: true });
	assert.match(full, /transparent=0/);
	assert.match(full, /full=1/);
});

test("other surfaces do not receive theater flags", () => {
	assert.equal(applyTheaterOptions(link("note")), link("note"));
});

test("unsafe URLs, unknown types, missing context and mismatched theater world are rejected", () => {
	for (const value of ["javascript:alert(1)", "file:///tmp/index.html", "https://user:pass@chat.example/#/internal/note/id?world=w&channel=c", link("constructor"), link("unknown"), link("theater"), link("note").replace("channel=channel", "channel="), link("note", "%E0%A4%A")]) {
		assert.throws(() => parseSurfaceLink(value), value);
	}
});

test("escaped links and encoded resource IDs follow SealChat URL semantics", () => {
	const surface = parseSurfaceLink(link("note", "hello%2F%E4%B8%96%E7%95%8C").replace("&channel", "&amp;channel"));
	assert.equal(surface.id, "hello/世界");
	assert.equal(surface.channelId, "channel");
});

test("current channel theater keeps deployment path and outer query", () => {
	const result = createTheaterLink("https://chat.example/sub/?theme=dark#/world/channel", { worldId: "w/a", channelId: "c b" });
	const surface = parseSurfaceLink(result);
	assert.equal(surface.id, "w/a");
	assert.equal(surface.channelId, "c b");
	assert.equal(surface.url.pathname, "/sub/");
	assert.equal(surface.url.searchParams.get("theme"), "dark");
	assert.throws(() => createTheaterLink("https://chat.example", null));
});

test("channel fallback accepts channel routes and rejects internal and embed routes", () => {
	assert.deepEqual(readChannelContext("https://chat.example/#/w/c?mobile=1"), { worldId: "w", channelId: "c" });
	assert.equal(readChannelContext(link("note")), null);
	assert.equal(readChannelContext("https://chat.example/#/embed/c"), null);
	assert.equal(readChannelContext("https://chat.example/#/login"), null);
});

test("resize minimum keeps opposite edges anchored", () => {
	const start = { left: 100, top: 80, width: 640, height: 400 };
	const left = resizeFloatingRect(start, "left", 1000, 0);
	assert.equal(left.width, 320);
	assert.equal(left.left + left.width, start.left + start.width);
	const top = resizeFloatingRect(start, "top", 0, 1000);
	assert.equal(top.height, 180);
	assert.equal(top.top + top.height, start.top + start.height);
	assert.deepEqual(resizeFloatingRect(start, "corner", 100, 50), { ...start, width: 740, height: 450 });
	assert.deepEqual(start, { left: 100, top: 80, width: 640, height: 400 });
});
