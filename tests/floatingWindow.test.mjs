import test from "node:test";
import assert from "node:assert/strict";
import { bindFloatingGesture } from "../scripts/floatingWindow.mjs";

function handle() {
	const listeners = new Map();
	let captured = null;
	return {
		closest: () => null,
		addEventListener(name, callback) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(callback); },
		removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
		setPointerCapture(id) { captured = id; },
		hasPointerCapture(id) { return id === captured; },
		releasePointerCapture() { captured = null; },
		emit(name, values = {}) {
			const event = { button: 0, pointerId: 1, clientX: 10, clientY: 20, target: this, preventDefault() {}, stopPropagation() {}, ...values };
			for (const callback of [...(listeners.get(name) ?? [])]) callback(event);
		},
		count(name) { return listeners.get(name)?.size ?? 0; }
	};
}

test("pointer capture keeps drag isolated and cancel removes gesture listeners", () => {
	const grip = handle();
	let rect = { left: 80, top: 40, width: 600, height: 300 };
	const completed = [];
	bindFloatingGesture(grip, { read: () => rect, write: value => { rect = value; }, finish: moved => completed.push(moved), scale: () => 2 });
	grip.emit("pointerdown");
	assert.equal(grip.hasPointerCapture(1), true);
	grip.emit("pointermove", { pointerId: 2, clientX: 200 });
	assert.equal(rect.left, 80);
	grip.emit("pointermove", { clientX: 50, clientY: 40 });
	assert.equal(rect.left, 100);
	assert.equal(rect.top, 50);
	grip.emit("pointercancel");
	assert.deepEqual(completed, [true]);
	assert.equal(grip.hasPointerCapture(1), false);
	assert.equal(grip.count("pointermove"), 0);
	grip.emit("pointermove", { clientX: 500 });
	assert.equal(rect.left, 100);
});

test("collapsed button icons remain draggable while nested window actions do not start drag", () => {
	const grip = handle();
	let active = 0;
	bindFloatingGesture(grip, { read: () => ({ left: 0, top: 0 }), write() {}, active: value => { if (value) active++; } });
	grip.emit("pointerdown", { target: { closest: () => ({}) } });
	assert.equal(active, 0);
	grip.emit("pointerdown", { target: { closest: () => grip } });
	assert.equal(active, 1);
	grip.emit("pointerup");
	grip.emit("pointerdown", { button: 2 });
	assert.equal(active, 1);
});

test("dispose during a gesture releases capture and prevents further drags", () => {
	const grip = handle();
	let completed = 0;
	const dispose = bindFloatingGesture(grip, { read: () => ({ left: 0, top: 0 }), write() {}, finish: () => { completed++; } });
	grip.emit("pointerdown");
	dispose();
	assert.equal(grip.hasPointerCapture(1), false);
	assert.equal(grip.count("pointerdown"), 0);
	assert.equal(grip.count("pointermove"), 0);
	assert.equal(completed, 1);
	grip.emit("pointerdown");
	assert.equal(grip.hasPointerCapture(1), false);
});
