(function () {
  const CONFIG = {
    API_BASE_URL:
      "https://shopify-agent-extension-412794838331.us-central1.run.app",
    STORAGE_KEYS: {
      USER_ID: "shopifyAgentUserId",
      CART_ID: "shopifyAgentCartId",
      SESSION_ID: "shopifyAgentSessionId",
    },
    TIMING: {
      FOCUS_DELAY: 300,
      KEYBOARD_DELAY: 500,
      SCROLL_DELAY: 100,
    },
  };

  const ShopifyAgent = {
    UI: {
      elements: {},
      isMobile: false,

      init(container) {
        if (!container) return;

        // Cache DOM elements for performance
        this.elements = {
          container: container,
          chatBubble: container.querySelector(".shopify-agent-bubble"),
          chatWindow: container.querySelector(".shopify-agent-window"),
          closeButton: container.querySelector(".shopify-agent-close"),
          chatInput: container.querySelector(
            '.shopify-agent-input input[type="text"]',
          ),
          sendButton: container.querySelector(".shopify-agent-send"),
          messagesContainer: container.querySelector(".shopify-agent-messages"),
        };

        // Detect if on mobile device
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        // Set up event listeners
        this.setUpEventListeners();
      },

      setUpEventListeners() {
        const {
          chatBubble,
          closeButton,
          chatInput,
          sendButton,
          messagesContainer,
        } = this.elements;

        // Toggle chat when bubble clicked
        chatBubble.addEventListener("click", () => this.toggleChatWindow());

        // Close chat on close button
        closeButton.addEventListener("click", () => this.toggleChatWindow());

        // Send on enter key
        chatInput.addEventListener("keydown", (e) => {
          if (
            e.key === "Enter" &&
            chatInput.value.trim() !== "" &&
            !chatInput.disabled
          ) {
            ShopifyAgent.Message.sendMessage(chatInput, messagesContainer);

            // Hide keyboard on mobile
            if (this.isMobile) {
              chatInput.blur();
              setTimeout(() => chatInput.focus(), CONFIG.TIMING.FOCUS_DELAY);
            }
          }
        });

        // Send on click
        sendButton.addEventListener("click", () => {
          if (
            chatInput.value.trim() !== "" &&
            !chatInput.disabled &&
            !sendButton.disabled
          ) {
            ShopifyAgent.Message.sendMessage(chatInput, messagesContainer);

            // Focus input after sending on mobile
            if (this.isMobile) {
              setTimeout(() => chatInput.focus(), CONFIG.TIMING.FOCUS_DELAY);
            }
          }
        });

        // Keep messages pinned to bottom on resize
        window.addEventListener("resize", () => this.scrollToBottom());
      },

      toggleChatWindow() {
        const { chatWindow, chatInput } = this.elements;

        const isOpen = chatWindow.classList.toggle("opacity-100");

        // Toggle open/close classes
        chatWindow.classList.toggle("pointer-events-auto", isOpen);
        chatWindow.classList.toggle("translate-y-0", isOpen);
        chatWindow.classList.toggle("opacity-0", !isOpen);
        chatWindow.classList.toggle("pointer-events-none", !isOpen);
        chatWindow.classList.toggle("translate-y-2", !isOpen);

        if (isOpen) {
          // Focus input & lock scroll on mobile
          if (this.isMobile) {
            document.body.classList.add(
              "overflow-hidden",
              "fixed",
              "w-full",
              "h-full",
            );
            setTimeout(() => chatInput.focus(), CONFIG.TIMING.KEYBOARD_DELAY);
          } else {
            chatInput.focus();
          }
          this.scrollToBottom();
        } else {
          // Unlock scroll when closed
          document.body.classList.remove(
            "overflow-hidden",
            "fixed",
            "w-full",
            "h-full",
          );
          if (this.isMobile) {
            chatInput.blur();
          }
        }
      },

      scrollToBottom() {
        const { messagesContainer } = this.elements;

        setTimeout(() => {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, CONFIG.TIMING.SCROLL_DELAY);
      },

      showTypingIndicator() {
        const { messagesContainer } = this.elements;

        const typingIndicator = document.createElement("div");

        typingIndicator.dataset.typingIndicator = "true";

        typingIndicator.className =
          "flex items-center gap-1.5 px-4 py-5 rounded-md bg-gray-100 self-start text-xl";

        typingIndicator.innerHTML = `
          <span class="w-3 h-3 rounded-full bg-violet-500 inline-block [animation:typing_1.4s_infinite_both]"></span>
          <span class="w-3 h-3 rounded-full bg-violet-500 inline-block [animation:typing_1.4s_infinite_both] [animation-delay:0.2s]"></span>
          <span class="w-3 h-3 rounded-full bg-violet-500 inline-block [animation:typing_1.4s_infinite_both] [animation-delay:0.4s]"></span>
        `;

        messagesContainer.appendChild(typingIndicator);
        this.scrollToBottom();
        this.disableInput();
      },

      removeTypingIndicator() {
        const { messagesContainer } = this.elements;

        const typingIndicator = messagesContainer.querySelector(
          '[data-typing-indicator="true"]',
        );

        if (typingIndicator) {
          typingIndicator.remove();
        }
        this.enableInput();
      },

      disableInput() {
        const { chatInput, sendButton } = this.elements;

        chatInput.disabled = true;
        chatInput.placeholder = "Waiting for response...";
        chatInput.classList.add("opacity-50", "cursor-not-allowed");

        sendButton.disabled = true;
        sendButton.classList.add("opacity-50", "cursor-not-allowed");
      },

      enableInput() {
        const { chatInput, sendButton } = this.elements;

        chatInput.disabled = false;
        chatInput.placeholder = "Ask me anything...";
        chatInput.classList.remove("opacity-50", "cursor-not-allowed");

        sendButton.disabled = false;
        sendButton.classList.remove("opacity-50", "cursor-not-allowed");
      },

      async refreshCartUI() {
        try {
          const response = await fetch("/cart");
          const html = await response.text();

          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");

          // Replace cart drawer
          const newDrawer = doc.querySelector(".cart-drawer");
          const currentDrawer = document.querySelector(".cart-drawer");
          if (newDrawer && currentDrawer) {
            currentDrawer.innerHTML = newDrawer.innerHTML;
          }

          // Replace cart icon bubble
          const newCartIcon = doc.querySelector("#cart-icon-bubble");
          const currentCartIcon = document.querySelector("#cart-icon-bubble");
          if (newCartIcon && currentCartIcon) {
            currentCartIcon.innerHTML = newCartIcon.innerHTML;
          }
        } catch (error) {
          console.error("Error in UI.refreshCartUI: ", error);
        }
      },
    },

    Message: {
      async sendMessage(chatInput, messagesContainer) {
        const userMessage = chatInput.value.trim();

        this.grayOutAllSuggestions(messagesContainer);

        let userId = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_ID);
        let cartId = sessionStorage.getItem(CONFIG.STORAGE_KEYS.CART_ID);
        let sessionId = sessionStorage.getItem(CONFIG.STORAGE_KEYS.SESSION_ID);

        // Add user message to chat and clear input
        ShopifyAgent.Message.addMessage(userMessage, "user", messagesContainer);
        chatInput.value = "";

        // Show typing indicator
        ShopifyAgent.UI.showTypingIndicator();

        try {
          if (!sessionId && userId) {
            sessionId = await ShopifyAgent.API.fetchLatestSession(userId);
            if (sessionId) {
              sessionStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_ID, sessionId);
            }
          }

          await ShopifyAgent.API.oneShotResponse(
            userMessage,
            userId,
            cartId,
            sessionId,
            messagesContainer,
          );
        } catch (error) {
          console.error("Error in Message.sendMessage: ", error);
          ShopifyAgent.UI.removeTypingIndicator();
          this.addMessage(
            "Sorry, I couldn't process your request at the moment. Please try again later.",
            "model",
            messagesContainer,
          );
        }
      },

      addMessage(messageContent, messageSender, messagesContainer) {
        const messageElement = document.createElement("div");

        messageElement.className = `max-w-[80%] px-4 py-3 rounded-md text-xl leading-snug break-words ${
          messageSender === "model"
            ? "bg-gray-100 text-gray-700 self-start"
            : "self-end bg-violet-500 text-white"
        }`;
        messageElement.innerHTML = this.formatMessageContent(messageContent);
        messagesContainer.appendChild(messageElement);

        ShopifyAgent.UI.scrollToBottom();
      },

      addSuggestions(suggestions, messagesContainer) {
        const suggestionsContainer = document.createElement("div");
        suggestionsContainer.className = "flex flex-col gap-2 mt-3 mb-2";
        suggestionsContainer.dataset.suggestionGroup = "true";

        suggestions.forEach((suggestion, index) => {
          const suggestionButton = document.createElement("button");
          suggestionButton.className =
            "text-left p-3 rounded-lg bg-violet-200 hover:bg-violet-300 text-gray-700 text-sm transition-colors cursor-pointer";

          suggestionButton.innerHTML = this.formatMessageContent(suggestion);

          // Track which suggestion this is
          suggestionButton.dataset.suggestionIndex = index;

          // Store original text for sending
          suggestionButton.dataset.originalText = suggestion;

          suggestionButton.addEventListener("click", () => {
            // Update suggestion states before sending message
            this.updateSuggestionStates(index, suggestionsContainer);

            // Use original text for sending, not the formatted HTML
            const chatInput = ShopifyAgent.UI.elements.chatInput;
            chatInput.value = suggestion;
            ShopifyAgent.Message.sendMessage(chatInput, messagesContainer);
          });

          suggestionsContainer.appendChild(suggestionButton);
        });

        messagesContainer.appendChild(suggestionsContainer);
        ShopifyAgent.UI.scrollToBottom();
      },

      updateSuggestionStates(clickedIndex, suggestionsContainer) {
        const suggestionButtons =
          suggestionsContainer.querySelectorAll("button");

        suggestionButtons.forEach((button, index) => {
          if (index === clickedIndex) {
            // Keep clicked suggestion purple/active
            button.className =
              "text-left p-3 rounded-lg bg-violet-500 text-white text-sm transition-colors cursor-pointer";
          } else {
            // Gray out other suggestions
            button.className =
              "text-left p-3 rounded-lg bg-gray-300 text-gray-500 text-sm transition-colors cursor-default";
            button.disabled = true;
          }
        });
      },

      grayOutAllSuggestions(messagesContainer) {
        const suggestionGroups = messagesContainer.querySelectorAll(
          '[data-suggestion-group="true"]',
        );

        suggestionGroups.forEach((group) => {
          const suggestionButtons = group.querySelectorAll("button");
          suggestionButtons.forEach((button) => {
            button.className =
              "text-left p-3 rounded-lg bg-gray-300 text-gray-500 text-sm transition-colors cursor-default";
            button.disabled = true;
          });
        });
      },

      grayOutHistoricalSuggestions(messagesContainer) {
        const suggestionGroups = messagesContainer.querySelectorAll(
          '[data-suggestion-group="true"]',
        );

        if (suggestionGroups.length === 0) return;

        // Gray out all suggestion groups except the last one (most recent)
        suggestionGroups.forEach((group, index) => {
          const isLatestGroup = index === suggestionGroups.length - 1;
          const suggestionButtons = group.querySelectorAll("button");

          suggestionButtons.forEach((button) => {
            if (!isLatestGroup) {
              // Gray out historical suggestions
              button.className =
                "text-left p-3 rounded-lg bg-gray-300 text-gray-500 text-sm transition-colors cursor-default";
              button.disabled = true;
            } else {
              // Keep latest suggestions active and clickable
              button.className =
                "text-left p-3 rounded-lg bg-violet-200 hover:bg-violet-300 text-gray-700 text-sm transition-colors cursor-pointer";
              button.disabled = false;
            }
          });
        });
      },

      formatMessageContent(messageContent) {
        if (!messageContent) return "";

        let formatted = messageContent;

        // 1. Format links: [text](url) -> <a href="url">text</a>
        formatted = formatted.replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-violet-600 hover:text-violet-800 underline">$1</a>',
        );

        // 2. Format bold text: **text** -> <strong>text</strong>
        formatted = formatted.replace(
          /\*\*([^*]+)\*\*/g,
          '<strong class="font-semibold">$1</strong>',
        );

        // 3. Format unordered lists: lines starting with "- " or "* "
        formatted = formatted.replace(
          /^[\s]*[-*]\s+(.+)$/gm,
          '<li class="ml-4 list-disc list-inside">$1</li>',
        );

        // 4. Format ordered lists: lines starting with "1. ", "2. ", etc.
        formatted = formatted.replace(
          /^[\s]*\d+\.\s+(.+)$/gm,
          '<li class="ml-4 list-decimal list-inside">$1</li>',
        );

        // 5. Wrap consecutive list items in proper list containers
        // Handle unordered lists
        formatted = formatted.replace(
          /(<li class="ml-4 list-disc[^"]*">[^<]*<\/li>[\s\n]*)+/g,
          (match) => {
            return '<ul class="my-2 space-y-1">' + match + "</ul>";
          },
        );

        // Handle ordered lists
        formatted = formatted.replace(
          /(<li class="ml-4 list-decimal[^"]*">[^<]*<\/li>[\s\n]*)+/g,
          (match) => {
            return '<ol class="my-2 space-y-1">' + match + "</ol>";
          },
        );

        // 6. Convert line breaks to <br> tags for proper spacing
        formatted = formatted.replace(/\n/g, "<br>");

        // 7. Clean up extra spacing around lists
        formatted = formatted.replace(/<br>(<[uo]l)/g, "$1");
        formatted = formatted.replace(/(<\/[uo]l>)<br>/g, "$1");

        return formatted;
      },

      parseMessageContent(messageContent, messagesContainer) {
        try {
          const parsedContent = JSON.parse(messageContent);

          if (parsedContent.message && parsedContent.suggestion) {
            this.addMessage(parsedContent.message, "model", messagesContainer);

            this.addSuggestions(parsedContent.suggestion, messagesContainer);
          }
        } catch (error) {
          this.addMessage(messageContent, "model", messagesContainer);
        }
      },
    },

    API: {
      async oneShotResponse(
        userMessage,
        userId,
        cartId,
        sessionId,
        messagesContainer,
      ) {
        const requestUrl = `${CONFIG.API_BASE_URL}/api/chat/send-message`;

        try {
          const response = await fetch(requestUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: userId,
              sessionId: sessionId,
              cartId: cartId,
              message: userMessage,
            }),
          });

          const data = await response.json();

          data.forEach((event) =>
            this.handleResponseEvent(event, messagesContainer),
          );
        } catch (error) {
          console.error("Error in API.oneShotResponse: ", error);
          throw error;
        }
      },

      handleResponseEvent(event, messagesContainer) {
        const part = event.content?.parts?.[0];

        if (event.author === "suggestion_agent") {
          // Render model message
          if (part.text) {
            ShopifyAgent.Message.parseMessageContent(
              part.text,
              messagesContainer,
            );
          }
        }

        // Refresh cart if cart tool triggered
        if (part.function_response?.name?.includes("cart")) {
          ShopifyAgent.UI.refreshCartUI();
        }

        ShopifyAgent.UI.removeTypingIndicator();
      },

      async fetchLatestSession(userId) {
        const requestUrl = `${CONFIG.API_BASE_URL}/api/chat/get-latest-session`;

        try {
          const response = await fetch(requestUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: userId,
            }),
          });

          const data = await response.json();

          return data.output.sessions[0]?.id;
        } catch (error) {
          console.error("Error in API.fetchLatestSession: ", error);
          return null;
        }
      },

      async fetchChatHistory(userId, sessionId, messagesContainer) {
        const loadingMessage = document.createElement("div");
        loadingMessage.className =
          "max-w-[80%] px-4 py-3 rounded-md text-xl leading-snug break-words bg-gray-100 text-gray-700 self-start";
        loadingMessage.textContent = "Loading conversation history...";
        messagesContainer.appendChild(loadingMessage);

        const requestUrl = `${CONFIG.API_BASE_URL}/api/chat/get-history`;

        try {
          const response = await fetch(requestUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: userId,
              sessionId: sessionId,
            }),
          });

          const data = await response.json();
          messagesContainer.removeChild(loadingMessage);

          // Render past messages
          if (data.output.events.length) {
            data.output.events.forEach((event) => {
              const role = event.author;
              const text = event.content?.parts?.[0]?.text;

              if (!text) return;

              if (role === "user") {
                const userMessage = ShopifyAgent.Util.extractUserMessage(text);
                ShopifyAgent.Message.addMessage(
                  userMessage,
                  role,
                  messagesContainer,
                );
              }

              if (role === "suggestion_agent") {
                ShopifyAgent.Message.parseMessageContent(
                  text,
                  messagesContainer,
                );
              }
            });

            ShopifyAgent.Message.grayOutHistoricalSuggestions(
              messagesContainer,
            );
          }
        } catch (error) {
          console.error("Error in API.fetchChatHistory: ", error);
          messagesContainer.removeChild(loadingMessage);
          ShopifyAgent.Message.addMessage(
            "Failed to load conversation history.",
            "model",
            messagesContainer,
          );
        }
      },

      async fetchCartId() {
        try {
          const response = await fetch("/cart.js");
          const data = await response.json();
          return data.token;
        } catch (error) {
          console.error("Error in API.fetchCartId: ", error);
          return null;
        }
      },
    },

    Util: {
      extractUserMessage(message) {
        const parts = message.split("user_message=");
        return parts.length > 1 ? parts[1].trim() : message;
      },

      showWelcomeMessage() {
        ShopifyAgent.UI.removeTypingIndicator();
        const welcomeMessage = "👋 Hi there! How can I help you today?";
        ShopifyAgent.Message.addMessage(
          welcomeMessage,
          "model",
          ShopifyAgent.UI.elements.messagesContainer,
        );
      },
    },

    async init() {
      const container = document.querySelector(".shopify-agent-container");
      if (!container) return;

      this.UI.init(container);
      this.UI.showTypingIndicator();

      // Check for existing conversation
      let userId = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_ID);
      let cartId = sessionStorage.getItem(CONFIG.STORAGE_KEYS.CART_ID);
      let sessionId = sessionStorage.getItem(CONFIG.STORAGE_KEYS.SESSION_ID);

      // Ensure cart ID exists
      if (!cartId) {
        cartId = await this.API.fetchCartId();

        if (cartId) {
          sessionStorage.setItem("shopifyAgentCartId", cartId);
        }
      }

      // Handle new user
      if (!userId) {
        userId = "user-" + crypto.randomUUID();
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_ID, userId);

        this.Util.showWelcomeMessage();
        return;
      }

      // Handle new sessions
      if (!sessionId) {
        sessionId = await this.API.fetchLatestSession(userId);

        if (sessionId) {
          sessionStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_ID, sessionId);
        } else {
          this.Util.showWelcomeMessage();
          return;
        }
      }

      this.UI.removeTypingIndicator();
      await this.API.fetchChatHistory(
        userId,
        sessionId,
        this.UI.elements.messagesContainer,
      );
    },
  };

  // Initialize the application when DOM is ready
  document.addEventListener("DOMContentLoaded", () => {
    ShopifyAgent.init();
  });
})();
