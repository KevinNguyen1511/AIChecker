// Safely inject and manage the floating UI box
function ensureAnswerBox() {
  let box = document.getElementById("quiz-answer-popup");
  if (box) return box;

  if (!document.body) return null;

  box = document.createElement("div");
  box.id = "quiz-answer-popup";

  // Floating Box CSS
  Object.assign(box.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "320px",
    minHeight: "70px",
    maxHeight: "380px",
    backgroundColor: "#1e1e2e",
    color: "#cdd6f4",
    borderRadius: "12px",
    boxShadow: "0px 10px 30px rgba(0,0,0,0.4)",
    zIndex: "2147483647",
    display: "none",
    flexDirection: "column",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "14px",
    lineHeight: "1.5",
    border: "1px solid #45475a",
    overflow: "hidden",
    transition: "width 0.2s ease"
  });

  // Header Bar (Draggable Handle)
  const header = document.createElement("div");
  Object.assign(header.style, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    backgroundColor: "#181825",
    borderBottom: "1px solid #313244",
    userSelect: "none",
    cursor: "grab"
  });

  const title = document.createElement("span");
  title.innerText = "⚡ Quiz Assistant";
  title.style.fontWeight = "bold";
  title.style.color = "#89b4fa";
  title.style.fontSize = "12px";
  title.style.pointerEvents = "none";

  const closeBtn = document.createElement("button");
  closeBtn.innerText = "✕";
  Object.assign(closeBtn.style, {
    background: "transparent",
    border: "none",
    color: "#a6adc8",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: "1"
  });

  closeBtn.onmouseover = () => (closeBtn.style.color = "#f38ba8");
  closeBtn.onmouseout = () => (closeBtn.style.color = "#a6adc8");
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    box.style.display = "none";
  };

  header.appendChild(title);
  header.appendChild(closeBtn);

  // Content Area
  const content = document.createElement("div");
  content.id = "quiz-answer-content";
  Object.assign(content.style, {
    padding: "12px 14px",
    overflowY: "auto",
    wordBreak: "break-word",
    maxHeight: "320px",
    color: "#cdd6f4"
  });

  box.appendChild(header);
  box.appendChild(content);
  document.body.appendChild(box);

  // Make the header draggable
  makeDraggable(box, header);

  return box;
}

// Drag and Drop Logic
function makeDraggable(box, handle) {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  handle.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;

    isDragging = true;
    handle.style.cursor = "grabbing";

    const rect = box.getBoundingClientRect();
    
    // Switch from right/bottom positioning to absolute top/left coordinates on first drag
    box.style.bottom = "auto";
    box.style.right = "auto";
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.top}px`;

    startX = e.clientX;
    startY = e.clientY;
    initialLeft = rect.left;
    initialTop = rect.top;

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  function onMouseMove(e) {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    box.style.left = `${initialLeft + dx}px`;
    box.style.top = `${initialTop + dy}px`;
  }

  function onMouseUp() {
    isDragging = false;
    handle.style.cursor = "grab";
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }
}

// Global Message Receiver
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_SELECTION") {
    const text = window.getSelection().toString().trim();
    sendResponse({ text: text });
    return true;
  } 
  
  if (request.action === "DISPLAY_ANSWER") {
    const box = ensureAnswerBox();
    if (!box) return;

    const content = document.getElementById("quiz-answer-content");
    
    box.style.display = "flex";
    if (content) {
      content.innerText = request.answer;
      content.scrollTop = 0;
    }

    if (request.answer.length > 180) {
      box.style.width = "400px";
    } else {
      box.style.width = "320px";
    }
    
    sendResponse({ status: "displayed" });
    return true;
  }
});

// Ensure initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ensureAnswerBox);
} else {
  ensureAnswerBox();
}