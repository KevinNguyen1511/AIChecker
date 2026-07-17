chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "EXTRACT_QUESTION") {
    // 1. Check if user highlighted text manually
    let extractedText = window.getSelection().toString().trim();

    // 2. Fallback: Search for common quiz container selectors across websites
    if (!extractedText) {
      const quizContainer = document.querySelector(
        '.question, .quiz-question, [class*="question"], [id*="question"], form, main'
      );
      if (quizContainer) {
        extractedText = quizContainer.innerText.trim();
      }
    }

    // 3. Last Fallback: Grab readable page text
    if (!extractedText) {
      extractedText = document.body.innerText.slice(0, 1000);
    }

    sendResponse({ text: extractedText });
  }
  return true;
});