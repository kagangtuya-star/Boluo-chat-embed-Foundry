const avatarCache = new Map();

export function clearAvatarCache() {
	avatarCache.clear();
}

export function loadAvatar(url) {
	if (!url) {
		return Promise.reject(new Error("empty avatar url"));
	}

	const cached = avatarCache.get(url);
	if (cached instanceof HTMLImageElement) {
		return Promise.resolve(cached);
	}

	if (cached) {
		return cached;
	}

	const pending = new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => {
			avatarCache.set(url, image);
			resolve(image);
		};
		image.onerror = () => {
			avatarCache.delete(url);
			reject(new Error(`failed to load avatar: ${url}`));
		};
		image.src = url;
	});

	avatarCache.set(url, pending);
	return pending;
}
