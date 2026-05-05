function roundNumber(value, fallback) {
	return Number.isFinite(value) ? Math.round(value) : fallback;
}

export const DIALOGUE_WORLD_DEFAULTS = {
	dialogueEnabled: false,
	dialogueTypeSpeed: 50,
	dialogueFontSize: 24,
	dialogueWaitSeconds: 4,
	dialogueThemeColor: "#0e0f10"
};

export const DIALOGUE_CLIENT_DEFAULTS = {
	dialogueWidth: 640,
	dialogueHeight: 280,
	dialogueTop: 56,
	dialogueLeft: 88,
	dialogueCollapsed: false,
	dialogueCollapsedTop: -1,
	dialogueCollapsedLeft: 88,
	dialogueCollapsedWidth: 48,
	dialogueCollapsedHeight: 48
};

export function normalizeDialogueClientSettings(value = {}) {
	return {
		dialogueWidth: roundNumber(value.dialogueWidth, DIALOGUE_CLIENT_DEFAULTS.dialogueWidth),
		dialogueHeight: roundNumber(value.dialogueHeight, DIALOGUE_CLIENT_DEFAULTS.dialogueHeight),
		dialogueTop: roundNumber(value.dialogueTop, DIALOGUE_CLIENT_DEFAULTS.dialogueTop),
		dialogueLeft: roundNumber(value.dialogueLeft, DIALOGUE_CLIENT_DEFAULTS.dialogueLeft),
		dialogueCollapsed: typeof value.dialogueCollapsed === "boolean"
			? value.dialogueCollapsed
			: DIALOGUE_CLIENT_DEFAULTS.dialogueCollapsed,
		dialogueCollapsedTop: roundNumber(value.dialogueCollapsedTop, DIALOGUE_CLIENT_DEFAULTS.dialogueCollapsedTop),
		dialogueCollapsedLeft: roundNumber(value.dialogueCollapsedLeft, DIALOGUE_CLIENT_DEFAULTS.dialogueCollapsedLeft),
		dialogueCollapsedWidth: roundNumber(value.dialogueCollapsedWidth, DIALOGUE_CLIENT_DEFAULTS.dialogueCollapsedWidth),
		dialogueCollapsedHeight: roundNumber(value.dialogueCollapsedHeight, DIALOGUE_CLIENT_DEFAULTS.dialogueCollapsedHeight)
	};
}
