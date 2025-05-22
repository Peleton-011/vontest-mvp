function getDomLineHeight($dom: HTMLElement) {
	const style = window.getComputedStyle($dom, null);
	const lineHeight = style.getPropertyValue("line-height");
	if (lineHeight === "normal") {
		// Create a temp element to get line-height
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

function truncateText(
	$container: HTMLElement,
	$textDom: HTMLElement,
	maxLine: number,
	ellipsisLength: number
) {
	const maxHeight = maxLine * getDomLineHeight($container);
	const text = $textDom.textContent;
	if (!text) return;
	let currentText = "";
	let left = 0;
	let right = text.length - 1;
	while (left < right) {
		const middle = Math.floor((left + right) / 2);
		if (left === middle) {
			break;
		}
		const temp = text.slice(left, middle);
		$textDom.innerText = currentText + temp;
		const { height } = $container.getBoundingClientRect();
		if (height > maxHeight) {
			right = middle;
		} else {
			currentText += temp;
			left = middle;
		}
	}
	$textDom.innerText = currentText.slice(
		0,
		currentText.length - (ellipsisLength + 2)
	);
}

export default function useTruncateText(
	$textContainerElem: HTMLElement,
	$textElem: HTMLElement,
	maxHeight: number,
	truncateFlagLess: string,
	truncateFlagMore: string
) {
	const MAX_LINE = maxHeight;
	const originText = $textElem.textContent || "";
	truncateText(
		$textContainerElem,
		$textElem,
		MAX_LINE,
		truncateFlagMore.length
	);
	let isEllipsis = true;
	const $more = document.createElement("span");
	$more.textContent = truncateFlagMore;
	//Style
	$more.style.cursor = "pointer";
	$more.style.color = "#05df72";
	$more.style.width = "100%";
	$more.style.textAlign = "right";

    //Append
	$textContainerElem.appendChild($more);
	$more.addEventListener("click", () => {
		if (isEllipsis) {
			$textElem.innerText = originText;
			$more.innerText = truncateFlagLess;
		} else {
			$more.innerText = truncateFlagMore;
			truncateText(
				$textContainerElem,
				$textElem,
				MAX_LINE,
				truncateFlagMore.length
			);
		}
		// reset the flag;
		isEllipsis = !isEllipsis;
	});
}
