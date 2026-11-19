// 对话框与 Internal Surface 共用的 Pointer Events 控制器。
export function resizeFloatingRect(start, edge, dx, dy, minWidth = 320, minHeight = 180) {
	const next = { ...start };
	if (edge === "left") {
		next.width = Math.max(minWidth, start.width - dx);
		next.left = start.left + start.width - next.width;
	}
	if (edge === "right" || edge === "corner") next.width = Math.max(minWidth, start.width + dx);
	if (edge === "top") {
		next.height = Math.max(minHeight, start.height - dy);
		next.top = start.top + start.height - next.height;
	}
	if (edge === "bottom" || edge === "corner") next.height = Math.max(minHeight, start.height + dy);
	return next;
}

export function bindFloatingGesture(handle, { read, write, finish, edge, scale = () => 1, active = () => {} }) {
	let cancelGesture = null;
	const down = (event) => {
		const interactive = event.target?.closest?.("button, input, select, a");
		if (event.button !== 0 || (interactive && interactive !== handle)) return;
		event.preventDefault();
		event.stopPropagation();
		cancelGesture?.();
		const start = { ...read() };
		const factor = Math.max(0.1, scale());
		let moved = false;
		const move = (nextEvent) => {
			if (nextEvent.pointerId !== event.pointerId) return;
			const dx = (nextEvent.clientX - event.clientX) / factor;
			const dy = (nextEvent.clientY - event.clientY) / factor;
			moved ||= Math.abs(dx) > 2 || Math.abs(dy) > 2;
			write(edge ? resizeFloatingRect(start, edge, dx, dy) : { ...start, left: start.left + dx, top: start.top + dy });
		};
		const stop = (endEvent) => {
			if (endEvent && endEvent.pointerId !== event.pointerId) return;
			handle.removeEventListener("pointermove", move);
			handle.removeEventListener("pointerup", stop);
			handle.removeEventListener("pointercancel", stop);
			handle.removeEventListener("lostpointercapture", stop);
			if (handle.hasPointerCapture?.(event.pointerId)) handle.releasePointerCapture(event.pointerId);
			cancelGesture = null;
			active(false);
			finish?.(moved);
		};
		cancelGesture = stop;
		handle.addEventListener("pointermove", move);
		handle.addEventListener("pointerup", stop);
		handle.addEventListener("pointercancel", stop);
		handle.addEventListener("lostpointercapture", stop);
		handle.setPointerCapture(event.pointerId);
		active(true);
	};
	handle.addEventListener("pointerdown", down);
	return () => { cancelGesture?.(); handle.removeEventListener("pointerdown", down); };
}
