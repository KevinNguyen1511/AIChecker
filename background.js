chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "solve", title: "Solve with Gemini", contexts: ["selection"] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "solve") process(tab.id, info.selectionText);
});

async function process(tabId, prompt) {
  const data = await chrome.storage.local.get("geminiKey");
  if (!data.geminiKey) return alert("Please set your API key in the extension options.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${data.geminiKey}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  
  const json = await response.json();
  const answer = json.candidates[0].content.parts[0].text;
  
  chrome.tabs.sendMessage(tabId, { action: "DISPLAY_ANSWER", answer });
}