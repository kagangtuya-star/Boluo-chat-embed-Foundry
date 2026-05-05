import test from "node:test";
import assert from "node:assert/strict";
import { createDialogueStore } from "../scripts/dialogue/store.mjs";

test("store updates bridge state and notifies subscribers", () => {
	const store = createDialogueStore();
	let called = 0;

	store.subscribe(() => {
		called += 1;
	});

	store.setBridgeReady({ worldId: "w1", channelId: "c1" });

	assert.equal(store.getState().bridgeReady, true);
	assert.equal(store.getState().worldId, "w1");
	assert.equal(store.getState().channelId, "c1");
	assert.equal(called, 1);
});

test("store routes queue events through reducer", () => {
	const store = createDialogueStore();
	store.dispatchQueueEvent({
		type: "enqueue",
		item: {
			messageId: "m1",
			identityId: null,
			displayName: "A",
			color: "",
			avatarUrl: "",
			text: "Hello",
			createdAt: 1
		}
	});

	assert.equal(store.getState().queue.current?.messageId, "m1");
});
