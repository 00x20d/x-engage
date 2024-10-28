const RESPONSE_TYPES = [
  { emoji: "🌟", text: "Great" },
  { emoji: "👍", text: "Agree" },
  { emoji: "🤔", text: "Disagree" },
  { emoji: "❓", text: "Question" },
];

// Update the color constants
const THEME_COLORS = {
  blue: "#1C9BEF", // Twitter Blue
  purple: "#7855FF", // Purple
  pink: "#F9197F", // Pink
  yellow: "#FFD400", // Yellow
  orange: "#FF7900", // Orange
  green: "#00BA7C", // Green
};

function createResponseButton(emoji, text) {
  const button = document.createElement("button");
  button.className = "xengage-btn";
  button.innerHTML = `${emoji} ${text}`;
  button.addEventListener("click", () => handleResponseClick(text));
  return button;
}

function createButtonContainer() {
  const container = document.createElement("div");
  container.className = "xengage-container";
  RESPONSE_TYPES.forEach(({ emoji, text }) => {
    container.appendChild(createResponseButton(emoji, text));
  });
  return container;
}

function getTweetContent() {
  // Get the tweet text from the closest tweet container
  const tweetText = document.querySelector('[data-testid="tweetText"]');
  if (!tweetText) return null;

  // Get all text content, excluding links
  const textContent = Array.from(tweetText.querySelectorAll(".css-1jxf684"))
    .filter((span) => !span.textContent.startsWith("http"))
    .map((span) => span.textContent)
    .join(" ")
    .trim();

  return textContent;
}

async function handleResponseClick(type) {
  const tweetContent = getTweetContent();
  if (!tweetContent) {
    console.error("Could not find tweet content");
    return;
  }

  try {
    // Get userId from storage
    const { userId } = await chrome.storage.sync.get("userId");

    // Send request to background script
    const response = await chrome.runtime.sendMessage({
      type: "GENERATE_RESPONSE",
      data: {
        tweetContent,
        responseType: type,
        userId,
      },
    });

    if (response.success) {
      // Find the editor
      const editor = document.querySelector(
        '.DraftEditor-editorContainer [contenteditable="true"]'
      );
      if (editor) {
        // Focus the editor first
        editor.focus();

        // Create a keyboard event to trigger X.com's editor initialization
        editor.dispatchEvent(
          new KeyboardEvent("keydown", { key: "a", bubbles: true })
        );

        // Small delay to ensure Draft.js has created the necessary spans
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Now find the data-text span that should exist
        const textSpan = editor.querySelector('[data-text="true"]');
        if (textSpan) {
          textSpan.textContent = response.generatedText;

          // Trigger both input and change events to ensure X.com updates properly
          editor.dispatchEvent(new Event("input", { bubbles: true }));
          editor.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          console.error("Could not find text span element");
        }
      }
    } else {
      console.error("Failed to generate response:", response.error);
    }
  } catch (error) {
    console.error("Error generating response:", error);
  }
}

function injectButtons() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if we're in a reply modal by looking for specific parent elements
          const isReplyModal = node.closest('[aria-modal="true"]');
          if (!isReplyModal) return;

          const editorContainer = node.querySelector(
            ".DraftEditor-editorContainer"
          );
          if (
            editorContainer &&
            !editorContainer.querySelector(".xengage-container")
          ) {
            editorContainer.parentNode.insertBefore(
              createButtonContainer(),
              editorContainer.nextSibling
            );
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function updateButtonColors(theme) {
  const color = THEME_COLORS[theme];
  console.log("Updating colors to:", theme, color);

  if (!color) {
    console.error("Invalid theme:", theme);
    return;
  }

  // Set the main color variable - this affects both border and text
  document.documentElement.style.setProperty("--xengage-color", color);

  // Create a semi-transparent version of the color for hover
  // Convert hex to RGB for transparency
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  document.documentElement.style.setProperty(
    "--xengage-hover-color",
    `rgba(${r}, ${g}, ${b}, 0.1)`
  );
}

// Add message listener for theme changes
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "THEME_CHANGED") {
    updateButtonColors(request.theme);
  }
});

// Add this to the end of the file to set initial theme
chrome.storage.sync.get("theme", ({ theme }) => {
  if (theme) {
    updateButtonColors(theme);
  }
});

// Initialize
injectButtons();
