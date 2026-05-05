function readEntityLength(value, index) {
	const end = value.indexOf(";", index + 1);
	return end === -1 ? 1 : (end - index) + 1;
}

function readTagLength(value, index) {
	const end = value.indexOf(">", index + 1);
	return end === -1 ? 1 : (end - index) + 1;
}

export function countVisibleCharacters(html) {
	if (typeof html !== "string" || html.length === 0) {
		return 0;
	}

	let count = 0;
	for (let index = 0; index < html.length; index += 1) {
		const char = html[index];
		if (char === "<") {
			index += readTagLength(html, index) - 1;
			continue;
		}

		if (char === "&") {
			index += readEntityLength(html, index) - 1;
		}

		count += 1;
	}

	return count;
}

export function sliceHtmlByVisibleCharacters(html, limit) {
	if (typeof html !== "string" || limit <= 0) {
		return "";
	}

	let visibleCount = 0;
	let output = "";

	for (let index = 0; index < html.length; index += 1) {
		const char = html[index];
		if (char === "<") {
			const length = readTagLength(html, index);
			output += html.slice(index, index + length);
			index += length - 1;
			continue;
		}

		if (visibleCount >= limit) {
			break;
		}

		if (char === "&") {
			const length = readEntityLength(html, index);
			output += html.slice(index, index + length);
			index += length - 1;
			visibleCount += 1;
			continue;
		}

		output += char;
		visibleCount += 1;
	}

	return output;
}
