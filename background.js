// Handle extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    // Set default theme
    const userId = crypto.randomUUID();
    await chrome.storage.sync.set({
      theme: "blue",
      userId,
    });
  }
});

// Message handling between content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background: Received message:", request);

  if (request.type === "GENERATE_RESPONSE") {
    console.log("Background: Handling GENERATE_RESPONSE request");
    generateResponse(request.data)
      .then((response) => {
        console.log("Background: Response generated successfully");
        sendResponse({ success: true, generatedText: response });
      })
      .catch((error) => {
        console.error("Background: Error generating response:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  } else if (request.type === "SAVE_API_KEY") {
    console.log("Background: Handling SAVE_API_KEY request");
    saveApiKey(request.apiKey)
      .then((response) => {
        console.log("Background: API key saved successfully:", response);
        sendResponse({ success: true, response });
      })
      .catch((error) => {
        console.error("Background: Error saving API key:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  } else if (request.type === "API_KEY_UPDATED") {
    // Notify all content scripts that the API key has been updated
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { type: "API_KEY_REFRESH" });
      });
    });
  } else if (request.type === "RESET_API_KEY") {
    chrome.storage.local.set({ hasApiKey: false }, () => {
      // Notify all tabs about API key removal
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          chrome.tabs.sendMessage(tab.id, { type: "API_KEY_REFRESH" });
        });
      });
    });
  }
  return true;
});

async function saveApiKey(apiKey) {
  console.log("Background: Starting saveApiKey function");

  const { userId } = await chrome.storage.sync.get("userId");
  console.log("Background: Retrieved userId:", userId);

  try {
    console.log("Background: Sending request to worker");
    const response = await fetch(
      "https://ai-commenting-tool.djuergens561.workers.dev/save-key",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId,
        },
        body: JSON.stringify({ apiKey }),
      }
    );

    console.log("Background: Received response from worker:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Background: Worker error response:", errorText);
      throw new Error(`Server error: ${errorText}`);
    }

    const data = await response.json();
    console.log("Background: Parsed response data:", data);

    await chrome.storage.local.set({ hasApiKey: true });
    console.log("Background: Updated local storage");

    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { type: "API_KEY_REFRESH" });
      });
    });

    return data;
  } catch (error) {
    console.error("Background: Error in saveApiKey:", error);
    throw error;
  }
}

async function generateResponse({ tweetContent, responseType, userId }) {
  const response = await fetch(
    "https://ai-commenting-tool.djuergens561.workers.dev/generate-response",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tweetContent, responseType, userId }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data.response;
}
