// 与 SealChat a83c088 的 Internal Surface 链接协议保持一致。
export const SURFACE_TYPES = Object.freeze({
	theater: "小剧场", iform: "交互表单", note: "便签", character: "角色卡", clue: "线索", "clue-board": "线索板"
});

function httpUrl(value) {
	const url = new URL(String(value).trim().replace(/&amp;/gi, "&"));
	if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
		throw new Error("请使用不含账号密码的 HTTP(S) 链接");
	}
	return url;
}

export function parseSurfaceLink(value) {
	const url = httpUrl(value);
	const match = url.hash.match(/^#\/internal\/([^/?#]+)\/([^/?#]+)\?([^#]+)$/);
	if (!match) throw new Error("请粘贴 SealChat 的 Internal Surface 链接");
	const type = decodeURIComponent(match[1]);
	const id = decodeURIComponent(match[2]).trim();
	const query = new URLSearchParams(match[3]);
	const worldId = (query.get("world") ?? "").trim();
	const channelId = (query.get("channel") ?? "").trim();
	if (!Object.hasOwn(SURFACE_TYPES, type) || !id || !worldId || !channelId) {
		throw new Error("链接缺少有效的类型、资源、世界或频道");
	}
	if (type === "theater" && id !== worldId) throw new Error("小剧场资源必须与世界一致");
	return { url, type, id, worldId, channelId, key: `${type}:${id}:${worldId}:${channelId}` };
}

export function applyTheaterOptions(value, { transparent = true, full = false } = {}) {
	const surface = parseSurfaceLink(value);
	if (surface.type === "theater") {
		const [path, search] = surface.url.hash.split("?");
		const query = new URLSearchParams(search);
		query.set("transparent", transparent ? "1" : "0");
		query.set("full", full ? "1" : "0");
		surface.url.hash = `${path}?${query}`;
	}
	return surface.url.href;
}

export function createTheaterLink(base, context, options) {
	const url = httpUrl(base);
	const worldId = String(context?.worldId ?? "").trim();
	const channelId = String(context?.channelId ?? "").trim();
	if (!worldId || !channelId) throw new Error("请先在侧栏进入 SealChat 频道，或粘贴小剧场浮层链接");
	const query = new URLSearchParams({ world: worldId, channel: channelId });
	url.hash = `/internal/theater/${encodeURIComponent(worldId)}?${query}`;
	return applyTheaterOptions(url.href, options);
}

export function readChannelContext(value) {
	try {
		const url = httpUrl(value);
		const match = url.hash.match(/^#\/([^/?#]+)\/([^/?#]+)(?:\?.*)?$/);
		if (!match || ["internal", "embed"].includes(match[1])) return null;
		return { worldId: decodeURIComponent(match[1]), channelId: decodeURIComponent(match[2]) };
	} catch {
		return null;
	}
}
