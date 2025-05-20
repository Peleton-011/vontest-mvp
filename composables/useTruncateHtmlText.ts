import truncate from "truncate-html";

function getDomLineHeight($dom: HTMLElement): number {
	const style = window.getComputedStyle($dom);
	const lineHeight = style.getPropertyValue("line-height");
	if (lineHeight === "normal") {
		const el = document.createElement("span");
		el.style.width = "300px";
		el.style.position = "absolute";
		el.style.visibility = "hidden";
		el.innerText = "Test";
		$dom.appendChild(el);
		const height = el.clientHeight;
		$dom.removeChild(el);
		return height;
	}
	return parseFloat(lineHeight);
}

function truncateHtmlContent(
	$container: HTMLElement,
	$textDom: HTMLElement,
	originalHtml: string,
	maxLine: number,
	ellipsis: string
) {
	const lineHeight = getDomLineHeight($container);
	const maxHeight = maxLine * lineHeight + 2; // add small tolerance
	let left = 0;
	let right = originalHtml.length;
	let result = originalHtml;

	while (left <= right) {
		const middle = Math.floor((left + right) / 2);
		const truncated = truncate(originalHtml, middle, { byWords: true });
		$textDom.innerHTML = truncated + ellipsis;

		const height = $container.getBoundingClientRect().height;

		if (height > maxHeight) {
			right = middle - 1;
		} else {
			result = truncated;
			left = middle + 1;
		}
	}

	$textDom.innerHTML = result + ellipsis;
}

export default function useTruncateHtmlText(
	$textContainerElem: HTMLElement,
	$textElem: HTMLElement,
	maxLines: number,
	lessText: string,
	moreText: string
) {
	const originalHtml = $textElem.innerHTML;
	let isTruncated = true;

	// Check if content already fits
	const lineHeight = getDomLineHeight($textContainerElem);
	const maxHeight = maxLines * lineHeight + 2; // tolerance
	$textElem.innerHTML = originalHtml;
	const actualHeight = $textContainerElem.getBoundingClientRect().height;

	if (actualHeight <= maxHeight) {
		// Exit early: no truncation or toggle needed
		return;
	}

	// Initial truncate
	truncateHtmlContent(
		$textContainerElem,
		$textElem,
		originalHtml,
		maxLines - 1,
		""
	);

	const $toggle = document.createElement("span");
	$toggle.textContent = moreText;
	$toggle.style.cursor = "pointer";
	$toggle.style.color = "#05df72";
	$toggle.style.width = "100%";
	$toggle.style.display = "flex";
	$toggle.style.justifyContent = "center";
	$toggle.style.marginTop = "0.5em";

	$textContainerElem.appendChild($toggle);

	$toggle.addEventListener("click", (e) => {
		e.preventDefault();
		e.stopPropagation();

		if (isTruncated) {
			$textElem.innerHTML = originalHtml;
			$toggle.textContent = lessText;
		} else {
			truncateHtmlContent(
				$textContainerElem,
				$textElem,
				originalHtml,
				maxLines,
				""
			);
			$toggle.textContent = moreText;
		}

		isTruncated = !isTruncated;
	});
}
