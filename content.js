function getLeetCodeProblemText() {
  const titleElement = document.querySelector('div[data-cy="question-title"]');
  const title = titleElement ? `Title: ${titleElement.innerText}\n\n` : "";

  const descriptionElement = document.querySelector('div[class^="_1l1MA"]');
  let description = "";
  if (descriptionElement) {
      const clone = descriptionElement.cloneNode(true);
      
      clone.querySelectorAll('img').forEach(img => {
          const altText = img.alt ? `[Image: ${img.alt}]` : '[Image]';
          img.parentNode.replaceChild(document.createTextNode(altText), img);
      });

      description = `Description:\n${clone.innerText}`;
  }

  let fullText = title + description;
  
  const examples = document.querySelectorAll('pre');
  if (examples.length > 0) {
      fullText += "\n\nExamples:\n";
      examples.forEach((example, index) => {
          fullText += `--- Example ${index + 1} ---\n${example.innerText}\n`;
      });
  }

  return fullText.trim();
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === "GET_ARTICLE_TEXT") { // Message type from popup.js
    const text = getLeetCodeProblemText();
    if (!text || text.length < 50) { // Basic check if extraction failed
        sendResponse({ text: null, error: "Could not extract problem details. Is this a LeetCode problem page?" });
    } else {
        sendResponse({ text });
    }
  }
});