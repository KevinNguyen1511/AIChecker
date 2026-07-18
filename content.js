chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_SELECTION") {
    sendResponse({ text: window.getSelection().toString().trim() });
    return true;
  } 
  
  if (request.action === "DISPLAY_ANSWER") {
    const { box, content } = ensurePopupExists();
    box.style.setProperty("display", "flex", "important");
    content.innerText = request.answer;
    sendResponse({ status: "displayed" });
    return true;
  }
});

function ensurePopupExists() {
  let host = document.getElementById("gemini-popup-root");
  if (host) {
    const shadowRoot = host.shadowRoot;
    return { 
      box: shadowRoot.getElementById("quiz-answer-popup"), 
      content: shadowRoot.getElementById("quiz-answer-content") 
    };
  }

  host = document.createElement("div");
  host.id = "gemini-popup-root";
  host.style.cssText = "position: absolute; top: 0; left: 0; z-index: 999999;";
  const shadowRoot = host.attachShadow({ mode: "open" });

  const box = document.createElement("div");
  box.id = "quiz-answer-popup";
  box.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; width: 340px; 
    background: #1e1e2e; color: #cdd6f4; border-radius: 8px; 
    box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: none; 
    flex-direction: column; font-family: sans-serif; font-size: 14px;
    border: 1px solid #45475a; overflow: hidden;
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    display: flex; justify-content: space-between; align-items: center; 
    padding: 8px 12px; background: #181825; cursor: grab; user-select: none;
    border-bottom: 1px solid #313244;
  `;
  
  const title = document.createElement("span");
  title.innerText = "⚡ Gemini Assistant";
  title.style.color = "#89b4fa";
  title.style.fontWeight = "bold";

  const closeBtn = document.createElement("button");
  closeBtn.innerText = "✕";
  closeBtn.style.cssText = "background: none; border: none; color: #a6adc8; cursor: pointer; font-size: 16px;";
  closeBtn.onclick = () => box.style.setProperty("display", "none", "important");

  header.appendChild(title);
  header.appendChild(closeBtn);

  const content = document.createElement("div");
  content.id = "quiz-answer-content";
  content.style.cssText = "padding: 12px; max-height: 300px; overflow-y: auto; white-space: pre-wrap;";

  box.appendChild(header);
  box.appendChild(content);
  shadowRoot.appendChild(box);
  document.body.appendChild(host);

  // Basic drag functionality
  let isDragging = false, startX, startY, initialLeft, initialTop;
  header.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    isDragging = true;
    const rect = box.getBoundingClientRect();
    box.style.bottom = "auto";
    box.style.right = "auto";
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.top}px`;
    startX = e.clientX; startY = e.clientY;
    initialLeft = rect.left; initialTop = rect.top;
  });
  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    box.style.left = `${initialLeft + (e.clientX - startX)}px`;
    box.style.top = `${initialTop + (e.clientY - startY)}px`;
  });
  document.addEventListener("mouseup", () => isDragging = false);

  return { box, content };
}