function escapeHtml(value) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function decodeHtmlEntities(value) {
	return value
		.replace(/&quot;/g, "\"")
		.replace(/&#34;/g, "\"")
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&");
}

function normalizePage(value) {
	return escapeHtml(decodeHtmlEntities(value))
		.replace(/\\t/g, "&emsp;&emsp;")
		.replace(/\\T/g, "&emsp;&emsp;&emsp;&emsp;")
		.replace(/\\&#39;/g, "'")
		.replace(/\\&quot;/g, "\"")
		.replace(/\\\\/g, "\\")
		.replace(/\\r\\n|\\n|\\r/g, "<br>")
		.replace(/\r\n|\n|\r/g, "<br>");
}

export function normalizeDialoguePages(text) {
	if (typeof text !== "string" || text.length === 0) {
		return [""];
	}

	return text.split("::").map((page) => normalizePage(page));
}
