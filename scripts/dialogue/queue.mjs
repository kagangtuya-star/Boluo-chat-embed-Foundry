function replaceOrAppend(items, item) {
	const index = items.findIndex((entry) => entry.messageId === item.messageId);
	if (index === -1) {
		return [...items, item];
	}

	const next = items.slice();
	next[index] = item;
	return next;
}

function nextCurrentFromPending(pending) {
	if (pending.length === 0) {
		return { current: null, pending: [] };
	}

	return {
		current: pending[0],
		pending: pending.slice(1)
	};
}

export function createQueueState() {
	return {
		current: null,
		pending: [],
		latest: null
	};
}

export function reduceQueueEvent(state, event) {
	if (!event || typeof event.type !== "string") {
		return state;
	}

	if (event.type === "enqueue") {
		if (!state.current) {
			return { current: event.item, pending: [], latest: event.item };
		}

		if (state.current.messageId === event.item.messageId) {
			return { current: event.item, pending: state.pending, latest: event.item };
		}

		return {
			current: state.current,
			pending: replaceOrAppend(state.pending, event.item),
			latest: event.item
		};
	}

	if (event.type === "delete") {
		if (state.current?.messageId === event.messageId) {
			const advanced = nextCurrentFromPending(state.pending);
			return {
				current: advanced.current,
				pending: advanced.pending,
				latest: state.latest?.messageId === event.messageId ? advanced.current : state.latest
			};
		}

		const pending = state.pending.filter((item) => item.messageId !== event.messageId);
		const latest = state.latest?.messageId === event.messageId ? pending[pending.length - 1] ?? state.current : state.latest;
		return { current: state.current, pending, latest };
	}

	if (event.type === "update") {
		const current = state.current?.messageId === event.item.messageId ? event.item : state.current;
		const pending = replaceOrAppend(
			state.pending.filter((entry) => entry.messageId !== event.item.messageId),
			event.item
		);
		const shouldKeepPending =
			current?.messageId !== event.item.messageId || state.pending.some((entry) => entry.messageId === event.item.messageId);

		return {
			current,
			pending: shouldKeepPending ? pending : state.pending,
			latest: state.latest?.messageId === event.item.messageId
				? event.item
				: (shouldKeepPending ? pending[pending.length - 1] : state.pending[state.pending.length - 1]) ?? current
		};
	}

	if (event.type === "advance") {
		const advanced = nextCurrentFromPending(state.pending);
		return {
			current: advanced.current,
			pending: advanced.pending,
			latest: advanced.pending[advanced.pending.length - 1] ?? advanced.current
		};
	}

	if (event.type === "fast-forward-latest") {
		if (!state.latest) {
			return state;
		}

		return {
			current: state.latest,
			pending: [],
			latest: state.latest
		};
	}

	return state;
}
