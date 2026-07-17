function ensureAnswerBox() {
  let box = document.getElementById("quiz-answer-popup");
  if (box) return box;

  box = document.createElement("div");
  box.id = "quiz-answer-popup";

  box.style.cssText = `
    position: fixed !important;
    bottom: 20px !important;
    right: 20px !important;
    width: 320px !important;
    min-height: 70px !important;
    max-height: 380px !important;
    background-color: #1e1e2e !important;
    color: #cdd6f4 !important;
    border-radius: 12px !important;
    box-shadow: 0px 10px 30px rgba(0,0,0,0.6) !important;
    z-index: 2147483647 !important;
    display: none !important;
    flex-direction: column !important;
    font-family: system-ui, -apple-system, sans-serif !important;
    font-size: 14px !important;
    line-height: 1.5 !important;
    border: 1px solid #45475a !important;
    overflow: hidden !important;
    opacity: 1 !important;
    visibility: visible !important;
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    padding: 8px 12px !important;
    background-color: #181825 !important;
    border-bottom: 1px solid #313244 !important;
    user-select: none !important;
    cursor: grab !important;
  `;

  const title = document.createElement("span");
  title.innerText = "⚡ Quiz Assistant";
  title.style.cssText = "font-weight: bold !important; color: #89b4fa !important; font-size: 12px !important; pointer-events: none !important;";

  const closeBtn = document.createElement("button");
  closeBtn.innerText = "✕";
  closeBtn.style.cssText = `
    background: transparent !important;
    border: none !important;
    color: #a6adc8 !important;
    font-size: 16px !important;
    font-weight: bold !important;
    cursor: pointer !important;
    padding: 0 4px !important;
    line-height: 1 !important;
  `;

  closeBtn.onclick = (e) => {
    e.stopPropagation();
    box.style.setProperty("display", "none", "important");
  };

  header.appendChild(title);
  header.appendChild(closeBtn);

  const content = document.createElement("div");
  content.id = "quiz-answer-content";
  content.style.cssText = `
    padding: 12px 14px !important;
    overflow-y: auto !important;
    word-break: break-word !important;
    max-height: 320px !important;
    color: #cdd6f4 !important;
  `;

  box.appendChild(header);
  box.appendChild(content);

  (document.documentElement || document.body).appendChild(box);

  makeDraggable(box, header);
  return box;
}

function makeDraggable(box, handle) {
  let isDragging = false;
  let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

  handle.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;

    isDragging = true;
    handle.style.cursor = "grabbing";

    const rect = box.getBoundingClientRect();
    box.style.setProperty("bottom", "auto", "important");
    box.style.setProperty("right", "auto", "important");
    box.style.setProperty("left", `${rect.left}px`, "important");
    box.style.setProperty("top", `${rect.top}px`, "important");

    startX = e.clientX;
    startY = e.clientY;
    initialLeft = rect.left;
    initialTop = rect.top;

    const onMouseMove = (moveEvent) => {
      if (!isDragging) return;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      box.style.setProperty("left", `${initialLeft + dx}px`, "important");
      box.style.setProperty("top", `${initialTop + dy}px`, "important");
    };

    const onMouseUp = () => {
      isDragging = false;
      handle.style.cursor = "grab";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_SELECTION") {
    sendResponse({ text: window.getSelection().toString().trim() });
    return true;
  } 
  
  if (request.action === "DISPLAY_ANSWER") {
    const box = ensureAnswerBox();
    const content = document.getElementById("quiz-answer-content");
    
    if (box && content) {
      box.style.setProperty("display", "flex", "important");
      content.innerText = request.answer;
      content.scrollTop = 0;

      if (request.answer.length > 180) {
        box.style.setProperty("width", "400px", "important");
      } else {
        box.style.setProperty("width", "320px", "important");
      }
    }
    
    sendResponse({ status: "displayed" });
    return true;
  }
});

ensureAnswerBox();