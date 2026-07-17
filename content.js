// Ensure container exists
let answerBox = document.getElementById("quiz-answer-popup");

if (!answerBox) {
  answerBox = document.createElement("div");
  answerBox.id = "quiz-answer-popup";
  
  // Dynamic scaling CSS
  Object.assign(answerBox.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    minWidth: "250px",
    maxWidth: "420px",
    minHeight: "50px",
    maxHeight: "350px",
    height: "auto",
    overflowY: "auto",
    backgroundColor: "#1e1e2e",
    color: "#cdd6f4",
    padding: "14px 18px",
    borderRadius: "12px",
    boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.3)",
    fontSize: "14px",
    lineHeight: "1.5",
    fontFamily: "sans-serif",
    zIndex: "999999",
    display: "none",
    transition: "all 0.2s ease-in-out",
    wordBreak: "break-word"
  });

  document.body.appendChild(answerBox);
}

// Listen for messages coming back from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_SELECTION") {
    const selection = window.getSelection().toString().trim();
    sendResponse({ text: selection });
  } else if (request.action === "DISPLAY_ANSWER") {
    answerBox.style.display = "block";
    answerBox.innerText = request.answer;
    
    // Scroll to top of response box smoothly
    answerBox.scrollTop = 0;
  }
});