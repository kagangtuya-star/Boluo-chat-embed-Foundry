import test from "node:test";
import assert from "node:assert/strict";
import {
	createHandshakeMessage,
	createUnsubscribeMessage,
	isHandshakeAckWithChannel,
	readRolesSnapshot,
	normalizeBridgeMessageEvent
} from "../scripts/dialogue/bridge.mjs";

test("handshake payload uses bridge contract", () => {
	const payload = createHandshakeMessage();
	assert.equal(payload.type, "sealchat.bridge.handshake");
	assert.equal(payload.version, 1);
	assert.deepEqual(payload.want, ["roles", "messages"]);
	assert.equal(payload.currentChannelOnly, true);
	assert.equal(typeof payload.nonce, "string");
	assert.notEqual(payload.nonce.length, 0);
});

test("unsubscribe payload uses bridge contract", () => {
	assert.deepEqual(createUnsubscribeMessage(), {
		type: "sealchat.bridge.unsubscribe"
	});
});

test("ack with non-empty channelId is ready", () => {
	assert.equal(isHandshakeAckWithChannel({ type: "sealchat.bridge.handshake.ack", channelId: "c1" }), true);
	assert.equal(isHandshakeAckWithChannel({ type: "sealchat.bridge.handshake.ack", channelId: "" }), false);
});

test("roles snapshot keeps valid identities only", () => {
	assert.deepEqual(readRolesSnapshot({
		type: "sealchat.bridge.roles.snapshot",
		roles: [
			{ identityId: "a", displayName: "Alpha", color: "#fff", avatarUrl: "https://img" },
			{ identityId: "" }
		]
	}), [{ identityId: "a", displayName: "Alpha", color: "#fff", avatarUrl: "https://img" }]);
});

test("normalizeBridgeMessageEvent accepts only IC public messages", () => {
	const rolesById = new Map([["a", { identityId: "a", displayName: "Alpha", color: "#fff", avatarUrl: "https://img" }]]);

	assert.equal(normalizeBridgeMessageEvent({
		type: "sealchat.bridge.message",
		event: "message-created",
		icMode: "ic",
		isWhisper: false,
		messageId: "m1",
		identityId: "a",
		contentText: "Hello"
	})?.type, "enqueue");

	assert.equal(normalizeBridgeMessageEvent({
		type: "sealchat.bridge.message",
		event: "message-created",
		icMode: "ooc",
		isWhisper: false,
		messageId: "m2",
		contentText: "No"
	}, rolesById), null);
});

test("normalizeBridgeMessageEvent returns update for message-updated and falls back to role snapshot", () => {
	const rolesById = new Map([["a", { identityId: "a", displayName: "Alpha", color: "#fff", avatarUrl: "https://img" }]]);

	assert.deepEqual(normalizeBridgeMessageEvent({
		type: "sealchat.bridge.message",
		event: "message-updated",
		icMode: "ic",
		isWhisper: false,
		messageId: "m3",
		identityId: "a",
		contentText: "Updated"
	}, rolesById), {
		type: "update",
		item: {
			messageId: "m3",
			identityId: "a",
			displayName: "Alpha",
			color: "#fff",
			avatarUrl: "https://img",
			text: "Updated",
			createdAt: null
		}
	});
});

test("normalizeBridgeMessageEvent returns delete event for message-deleted", () => {
	assert.deepEqual(normalizeBridgeMessageEvent({
		type: "sealchat.bridge.message",
		event: "message-deleted",
		messageId: "m4"
	}), {
		type: "delete",
		messageId: "m4"
	});
});
