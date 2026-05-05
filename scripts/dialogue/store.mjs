import { createQueueState, reduceQueueEvent } from "./queue.mjs";
import { DIALOGUE_WORLD_DEFAULTS, DIALOGUE_CLIENT_DEFAULTS } from "./settings.mjs";

export function createDialogueStore() {
	const listeners = new Set();
	const state = {
		bridgeReady: false,
		worldId: "",
		channelId: "",
		rolesById: new Map(),
		queue: createQueueState(),
		settings: { ...DIALOGUE_WORLD_DEFAULTS, ...DIALOGUE_CLIENT_DEFAULTS }
	};

	function emit() {
		for (const listener of listeners) {
			listener(state);
		}
	}

	return {
		getState() {
			return state;
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		setBridgeReady({ worldId, channelId }) {
			state.bridgeReady = true;
			state.worldId = worldId ?? "";
			state.channelId = channelId ?? "";
			emit();
		},
		setBridgeWaiting() {
			state.bridgeReady = false;
			state.worldId = "";
			state.channelId = "";
			emit();
		},
		setRoles(roles) {
			state.rolesById = new Map(roles.map((role) => [role.identityId, role]));
			emit();
		},
		setSettings(settings) {
			state.settings = { ...state.settings, ...settings };
			emit();
		},
		dispatchQueueEvent(event) {
			state.queue = reduceQueueEvent(state.queue, event);
			emit();
		}
	};
}
