import test from "node:test";
import assert from "node:assert/strict";
import { createQueueState, reduceQueueEvent } from "../scripts/dialogue/queue.mjs";

const alpha = { messageId: "a", identityId: null, displayName: "Alpha", color: "#fff", avatarUrl: "", text: "one", createdAt: 1 };
const beta = { messageId: "b", identityId: null, displayName: "Beta", color: "#fff", avatarUrl: "", text: "two", createdAt: 2 };

test("enqueue fills current then pending", () => {
	let state = reduceQueueEvent(createQueueState(), { type: "enqueue", item: alpha });
	state = reduceQueueEvent(state, { type: "enqueue", item: beta });
	assert.equal(state.current?.messageId, "a");
	assert.deepEqual(state.pending.map((item) => item.messageId), ["b"]);
});

test("delete current advances to next item", () => {
	let state = reduceQueueEvent(createQueueState(), { type: "enqueue", item: alpha });
	state = reduceQueueEvent(state, { type: "enqueue", item: beta });
	state = reduceQueueEvent(state, { type: "delete", messageId: "a" });
	assert.equal(state.current?.messageId, "b");
});

test("fast-forward-latest drops pending and jumps latest", () => {
	let state = reduceQueueEvent(createQueueState(), { type: "enqueue", item: alpha });
	state = reduceQueueEvent(state, { type: "enqueue", item: beta });
	state = reduceQueueEvent(state, { type: "fast-forward-latest" });
	assert.equal(state.current?.messageId, "b");
	assert.equal(state.pending.length, 0);
});

test("update replaces current item in place", () => {
	let state = reduceQueueEvent(createQueueState(), { type: "enqueue", item: alpha });
	state = reduceQueueEvent(state, {
		type: "update",
		item: { ...alpha, text: "one updated" }
	});
	assert.equal(state.current?.text, "one updated");
});

test("advance shifts next pending item into current", () => {
	let state = reduceQueueEvent(createQueueState(), { type: "enqueue", item: alpha });
	state = reduceQueueEvent(state, { type: "enqueue", item: beta });
	state = reduceQueueEvent(state, { type: "advance" });
	assert.equal(state.current?.messageId, "b");
	assert.equal(state.pending.length, 0);
});
