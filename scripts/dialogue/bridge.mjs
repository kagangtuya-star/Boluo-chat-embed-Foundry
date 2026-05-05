function isRecord(value) {
	return typeof value === "object" && value !== null;
}

function readString(value) {
	return typeof value === "string" ? value : "";
}

function resolveRoleField(data, field, rolesById) {
	const direct = readString(data[field]);
	if (direct.length > 0) {
		return direct;
	}

	const identityId = readString(data.identityId);
	if (!identityId) {
		return "";
	}

	return readString(rolesById?.get(identityId)?.[field]);
}

export function createHandshakeMessage() {
	return {
		type: "sealchat.bridge.handshake",
		version: 1,
		nonce: `foundry-${Date.now()}`,
		want: ["roles", "messages"],
		currentChannelOnly: true
	};
}

export function createUnsubscribeMessage() {
	return {
		type: "sealchat.bridge.unsubscribe"
	};
}

export function isHandshakeAckWithChannel(data) {
	return isRecord(data)
		&& data.type === "sealchat.bridge.handshake.ack"
		&& typeof data.channelId === "string"
		&& data.channelId.length > 0;
}

export function readRolesSnapshot(data) {
	if (!isRecord(data) || data.type !== "sealchat.bridge.roles.snapshot" || !Array.isArray(data.roles)) {
		return null;
	}

	return data.roles
		.filter((entry) => isRecord(entry))
		.map((entry) => ({
			identityId: readString(entry.identityId),
			displayName: readString(entry.displayName),
			color: readString(entry.color),
			avatarUrl: readString(entry.avatarUrl)
		}))
		.filter((entry) => entry.identityId.length > 0);
}

export function normalizeBridgeMessageEvent(data, rolesById = new Map()) {
	if (!isRecord(data) || data.type !== "sealchat.bridge.message") {
		return null;
	}

	if (data.event === "message-deleted") {
		const messageId = readString(data.messageId);
		return messageId ? { type: "delete", messageId } : null;
	}

	if (data.icMode !== "ic" || data.isWhisper !== false) {
		return null;
	}

	if (data.event !== "message-created" && data.event !== "message-updated") {
		return null;
	}

	const messageId = readString(data.messageId);
	const text = readString(data.contentText).trim();
	if (!messageId || !text) {
		return null;
	}

	return {
		type: data.event === "message-updated" ? "update" : "enqueue",
		item: {
			messageId,
			identityId: readString(data.identityId) || null,
			displayName: resolveRoleField(data, "displayName", rolesById) || "未知角色",
			color: resolveRoleField(data, "color", rolesById),
			avatarUrl: resolveRoleField(data, "avatarUrl", rolesById),
			text,
			createdAt: Number.isFinite(data.createdAt) ? data.createdAt : null
		}
	};
}
