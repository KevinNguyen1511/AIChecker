function createAnswerBox() {
  let box = document.getElementById("ai-quiz-answer-box");
  if (!box) {
    box = document.createElement("div");
    box.id = "ai-quiz-answer-box";
    box.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 320px;
      max-height: 250px;
      background: #1e1e2e;
      color: #cdd6f4;
      border: 1px solid #89b4fa;
      border-radius: 8px;
      padding: 14px;
      box-shadow: 0px 4px 15px rgba(0,0,0,0.4);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      z-index: 999999;
      overflow-y: auto;
      display: none;
    `;
    document.body.appendChild(box);
  }
  return box;
}

function showAnswer(text, isError = false) {
  const box = createAnswerBox();
  box.style.display = "block";
  box.style.borderColor = isError ? "#f38ba8" : "#89b4fa";
  
  box.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-weight:bold; color:#89b4fa;">
      <span>💡 AI Answer</span>
      <span id="ai-quiz-close-btn" style="cursor:pointer; font-size:16px; color:#a6adc8; padding:2px 6px;">✕</span>
    </div>
    <div id="ai-quiz-body">${text}</div>
  `;

  document.getElementById("ai-quiz-close-btn").onclick = function() {
    box.style.display = "none";
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_SELECTION") {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      showAnswer("🚀 Opening ChatGPT...");
      sendResponse({ text: selectedText });
    } else {
      showAnswer("⚠️ Please highlight the question text first.", true);
      sendResponse({ text: null });
    }
  } else if (request.action === "DISPLAY_ANSWER") {
    showAnswer(request.answer);
  }
  return true;
});