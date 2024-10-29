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
  button.addEventListener("click", () => handleResponseClick(text, button));
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

async function handleResponseClick(type, button) {
  const tweetContent = getTweetContent();
  if (!tweetContent) {
    console.error("Could not find tweet content");
    return;
  }

  try {
    // Add loading state
    button.classList.add("loading");
    button.disabled = true;
    const originalText = button.innerHTML;
    button.innerHTML = `${originalText} ...`;

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

    if (response.error === "NO_API_KEY") {
      showError(
        "Please add your API key in the extension settings to use this feature"
      );
      return;
    }

    if (response.success) {
      const editor = document.querySelector(
        '.DraftEditor-editorContainer [contenteditable="true"]'
      );
      if (editor) {
        editor.focus();
        editor.dispatchEvent(
          new KeyboardEvent("keydown", { key: "a", bubbles: true })
        );

        await new Promise((resolve) => setTimeout(resolve, 50));

        const textSpan = editor.querySelector('[data-text="true"]');
        if (textSpan) {
          textSpan.textContent = response.generatedText;
          editor.dispatchEvent(new Event("input", { bubbles: true }));
          editor.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    } else {
      showError(response.error || "Failed to generate response");
    }
  } catch (error) {
    showError("Error generating response. Please check your API key.");
  } finally {
    // Remove loading state
    button.classList.remove("loading");
    button.disabled = false;
    button.innerHTML = originalText;
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
  } else if (request.type === "API_KEY_REFRESH") {
    // Clear any existing error messages
    const existingError = document.querySelector(".tweet-reply-error");
    if (existingError) existingError.remove();

    // Re-enable any disabled buttons
    document.querySelectorAll(".xengage-btn").forEach((button) => {
      button.classList.remove("loading");
      button.disabled = false;
      // Reset button text if it was in loading state
      if (button.textContent.includes("...")) {
        const [emoji, text] = button.textContent.split(" ");
        button.innerHTML = `${emoji} ${text.replace(" ...", "")}`;
      }
    });
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

// Update the showError function styling to match Twitter's design
function showError(message) {
  const existingError = document.querySelector(".tweet-reply-error");
  if (existingError) existingError.remove();

  const errorDiv = document.createElement("div");
  errorDiv.className = "tweet-reply-error";
  errorDiv.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: #F4212E;
    color: white;
    padding: 12px;
    text-align: center;
    font-size: 14px;
    z-index: 10000;
    border-radius: 16px 16px 0 0;
  `;
  errorDiv.textContent = message;

  // Insert error at the top of the reply modal
  const modal = document.querySelector('[aria-modal="true"]');
  if (modal) {
    modal.style.position = "relative";
    modal.insertBefore(errorDiv, modal.firstChild);
  }

  setTimeout(() => errorDiv.remove(), 5000);
}
