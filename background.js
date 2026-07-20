importScripts("screenshot_utils.js", "screenshot.js");

// Create Right-Click Menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "solve-with-gemini",
    title: "Solve with Gemini",
    contexts: ["selection"]
  });
});

// Listen for Right-Click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "solve-with-gemini" && info.selectionText) {
    callGeminiAPI(tab.id, info.selectionText);
  }
});

// Listen for Keyboard Shortcut (Alt+S / Option+S)
chrome.commands.onCommand.addListener((command) => {
  if (command === "send-quiz-question") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;
      
      const tabId = tabs[0].id;
      
      // Ask content.js for the highlighted text
      chrome.tabs.sendMessage(tabId, { action: "GET_SELECTION" }, (response) => {
        
        // Prevent crashes if the shortcut is pressed on restricted pages
        if (chrome.runtime.lastError) {
          console.warn("Cannot run on this page. Try on a normal website.");
          return;
        }
        
        if (response && response.text) {
          callGeminiAPI(tabId, response.text);
        } else {
          // Nothing highlighted: let the user snip the question instead.
          captureAndSolve(tabId);
        }
      });
    });
  }
});

// Snip a region of the page and send it to Gemini like a highlighted question.
async function captureAndSolve(tabId) {
  try {
    const screenshot = await captureSelectedRegion();
    await callGeminiAPI(tabId, "Answer the question shown in this image.", screenshot.dataUrl);
  } catch (error) {
    if (error instanceof ScreenshotSelectionCancelledError) return;
    chrome.tabs.sendMessage(tabId, {
      action: "DISPLAY_ANSWER",
      answer: `❌ ${error instanceof Error ? error.message : "Unable to capture the selected region."}`
    });
  }
}

async function callGeminiAPI(tabId, promptText, imageDataUrl) {
  // Show loading state
  chrome.tabs.sendMessage(tabId, { action: "DISPLAY_ANSWER", answer: "⏳ Thinking..." });

  // Get API key from storage
  const data = await chrome.storage.local.get("geminiKey");
  if (!data.geminiKey) {
    chrome.tabs.sendMessage(tabId, { action: "DISPLAY_ANSWER", answer: "❌ Missing API Key. Right-click the extension icon and click 'Options' to add it." });
    return;
  }

  // Your strict, concise instructions
  const systemInstruction = "Give short answers only. In case of multiple choice, give the direct correct answer or letter immediately, followed by a super short 1-sentence explanation max.";
  
  // Updated model URL to use Gemini 3.5 Flash
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${data.geminiKey}`;

  const parts = [{ text: `${systemInstruction}\n\nQuestion: ${promptText}` }];
  if (imageDataUrl) {
    parts.push({ inline_data: { mime_type: "image/png", data: imageDataUrl.split(",")[1] } });
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] })
    });

    const json = await response.json();
    
    if (json.error) throw new Error(json.error.message);
    
    const answer = json.candidates[0].content.parts[0].text;
    chrome.tabs.sendMessage(tabId, { action: "DISPLAY_ANSWER", answer: answer });

  } catch (error) {
    chrome.tabs.sendMessage(tabId, { action: "DISPLAY_ANSWER", answer: `❌ Error: ${error.message}` });
  }
}