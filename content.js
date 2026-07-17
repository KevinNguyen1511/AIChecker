// Build or retrieve floating answer container
function getOrCreateAnswerBox() {
  let box = document.getElementById("quiz-answer-popup");
  if (box) return box;

  box = document.createElement("div");
  box.id = "quiz-answer-popup";

  // Dynamic styling
  Object.assign(box.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "320px",
    minHeight: "80px",
    maxHeight: "400px",
    backgroundColor: "#1e1e2e",
    color: "#cdd6f4",
    borderRadius: "12px",
    boxShadow: "0px 10px 30px rgba(0,0,0,0.4)",
    zIndex: "9999999",
    display: "none",
    flexDirection: "column",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "14px",
    lineHeight: "1.5",
    border: "1px solid #45475a",
    overflow: "hidden",
    transition: "height 0.2s ease, width 0.2s ease"
  });

  // Top Bar with Close Button
  const header = document.createElement("div");
  Object.assign(header.style, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    backgroundColor: "#181825",
    borderBottom: "1px solid #313244",
    userSelect: "none"
  });

  const title = document.createElement("span");
  title.innerText = "⚡ Quiz Assistant";
  title.style.fontWeight = "bold";
  title.style.color = "#89b4fa";
  title.style.fontSize = "12px";

  const closeBtn = document.createElement("button");
  closeBtn.innerText = "✕";
  Object.assign(closeBtn.style, {
    background: "transparent",
    border: "none",
    color: "#a6adc8",
    fontSize: "16px",
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: "1"
  });

  closeBtn.onmouseover = () => (closeBtn.style.color = "#f38ba8");
  closeBtn.onmouseout = () => (closeBtn.style.color = "#a6adc8");
  closeBtn.onclick = () => {
    box.style.display = "none";
  };

  header.appendChild(title);
  header.appendChild(closeBtn);

  // Content Container
  const content = document.createElement("div");
  content.id = "quiz-answer-content";
  Object.assign(content.style, {
    padding: "12px 14px",
    overflowY: "auto",
    wordBreak: "break-word",
    maxHeight: "350px"
  });

  box.appendChild(header);
  box.appendChild(content);
  document.body.appendChild(box);

  return box;
}

// Handle inbound tab messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_SELECTION") {
    const text = window.getSelection().toString().trim();
    sendResponse({ text: text });
  } else if (request.action === "DISPLAY_ANSWER") {
    const box = getOrCreateAnswerBox();
    const content = document.getElementById("quiz-answer-content");
    
    box.style.display = "flex";
    content.innerText = request.answer;

    // Expand width automatically for long content
    if (request.answer.length > 200) {
      box.style.width = "400px";
    } else {
      box.style.width = "320px";
    }

    content.scrollTop = 0;
  }
});