import truncate from "truncate-html"

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
	maxLine: number,
	ellipsis: string
) {
	const maxHeight = maxLine * getDomLineHeight($container);
	const originalHtml = $textDom.innerHTML;

	let left = 0;
	let right = originalHtml.length;
	let result = originalHtml;

	while (left < right) {
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

	$textDom.innerHTML = result ;
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

	truncateHtmlContent(
		$textContainerElem,
		$textElem,
		maxLines,
		moreText
	);

	const $toggle = document.createElement("span");
	$toggle.textContent = moreText;
	$toggle.style.cursor = "pointer";
	$toggle.style.color = "#05df72";
    $toggle.style.width = "100%";
    $toggle.style.display = "flex";
    $toggle.style.justifyContent = "center";
    $toggle.style.marginLeft = "0.5em";

	$textContainerElem.appendChild($toggle);

	$toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
		if (isTruncated) {
			$textElem.innerHTML = originalHtml;
			$toggle.textContent = lessText;
		} else {
			truncateHtmlContent(
				$textContainerElem,
				$textElem,
				maxLines,
				moreText
			);
			$toggle.textContent = moreText;
		}
		isTruncated = !isTruncated;
	});
}
