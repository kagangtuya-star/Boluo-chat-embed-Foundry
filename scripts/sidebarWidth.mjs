export const DEFAULT_PREFERRED_SIDEBAR_WIDTH = 310;
export const DEFAULT_MIN_USEFUL_SIDEBAR_WIDTH = 360;
export const DEFAULT_SAFE_VIEWPORT_GUTTER = 96;

/**
 * 计算聊天标签激活时的目标侧边栏宽度
 * 规则：
 * 1. 不小于当前宽度与推荐宽度中的较大值
 * 2. 不超过视口安全上限，避免小屏溢出
 * @param {{
 * 	currentWidth?: number,
 * 	viewportWidth?: number,
 * 	preferredWidth?: number,
 * 	minUsefulWidth?: number,
 * 	horizontalChromeWidth?: number,
 * 	uiScale?: number,
 * 	safeViewportGutter?: number
 * }} options
 * @returns {number}
 */
export function calculateSidebarTargetWidth(options = {}) {
	const {
		currentWidth = 0,
		viewportWidth = 0,
		preferredWidth = DEFAULT_PREFERRED_SIDEBAR_WIDTH,
		minUsefulWidth = DEFAULT_MIN_USEFUL_SIDEBAR_WIDTH,
		horizontalChromeWidth = 0,
		uiScale = 1,
		safeViewportGutter = DEFAULT_SAFE_VIEWPORT_GUTTER
	} = options;

	const normalizedCurrentWidth = Number.isFinite(currentWidth) ? Math.max(0, currentWidth) : 0;
	const normalizedViewportWidth = Number.isFinite(viewportWidth) ? Math.max(0, viewportWidth) : 0;
	const normalizedPreferredWidth = Number.isFinite(preferredWidth) ? Math.max(0, preferredWidth) : 0;
	const normalizedMinUsefulWidth = Number.isFinite(minUsefulWidth) ? Math.max(0, minUsefulWidth) : 0;
	const normalizedHorizontalChromeWidth = Number.isFinite(horizontalChromeWidth) ?
		Math.max(0, horizontalChromeWidth) :
		0;
	const normalizedUiScale = Number.isFinite(uiScale) && uiScale > 0 ? uiScale : 1;
	const normalizedSafeViewportGutter = Number.isFinite(safeViewportGutter) ?
		Math.max(0, safeViewportGutter) :
		0;

	const desiredContentWidth = Math.max(
		normalizedCurrentWidth,
		normalizedPreferredWidth,
		normalizedMinUsefulWidth
	);
	const desiredWidth = desiredContentWidth + (normalizedHorizontalChromeWidth / normalizedUiScale);

	if (!normalizedViewportWidth) return desiredWidth;

	const viewportSafeWidth = Math.max(0, normalizedViewportWidth - normalizedSafeViewportGutter);
	return Math.min(desiredWidth, viewportSafeWidth || desiredWidth);
}
