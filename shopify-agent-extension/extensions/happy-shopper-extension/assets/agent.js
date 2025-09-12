(function () {
  const API_BASE_URL =
    "https://shopify-agent-extension-412794838331.us-central1.run.app";

  const ShopifyAgent = {
    UI: {
      elements: {},
      isMobile: false,

      init(container) {
        if (!container) return;

        // Cache DOM elements
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
          if (e.key === "Enter" && chatInput.value.trim() !== "") {
            ShopifyAgent.Message.send(chatInput, messagesContainer);

            // Hide keyboard on mobile
            if (this.isMobile) {
              chatInput.blur();
              setTimeout(() => chatInput.focus(), 300);
            }
          }
        });

        // Send on click
        sendButton.addEventListener("click", () => {
          if (chatInput.value.trim() !== "") {
            ShopifyAgent.Message.send(chatInput, messagesContainer);

            // Focus input after sending on mobile
            if (this.isMobile) {
              setTimeout(() => chatInput.focus(), 300);
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
            setTimeout(() => chatInput.focus(), 500);
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
        }, 100);
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
      },

      removeTypingIndicator() {
        const { messagesContainer } = this.elements;

        const typingIndicator = messagesContainer.querySelector(
          '[data-typing-indicator="true"]',
        );

        if (typingIndicator) {
          typingIndicator.remove();
        }
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

          // Replace cart count
          const newCount = doc.querySelector(".cart-count-bubble");
          const currentCount = document.querySelector(".cart-count-bubble");
          if (newCount && currentCount) {
            currentCount.innerHTML = newCount.innerHTML;
          }
        } catch (error) {
          console.error("Error in UI.refreshCartUI: ", error);
        }
      },
    },

    Message: {
      async send(chatInput, messagesContainer) {
        const userMessage = chatInput.value.trim();

        let userId = localStorage.getItem("shopifyAgentUserId");
        let cartId = sessionStorage.getItem("shopifyAgentCartId");
        let sessionId = sessionStorage.getItem("shopifyAgentSessionId");

        // Add user message to chat
        ShopifyAgent.Message.add(userMessage, "user", messagesContainer);
        chatInput.value = "";

        // Show typing indicator
        ShopifyAgent.UI.showTypingIndicator();

        try {
          if (!sessionId) {
            sessionId = await ShopifyAgent.API.fetchLatestSession(userId);
            if (sessionId) {
              sessionStorage.setItem("shopifyAgentSessionId", sessionId);
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
          console.error("Error in Message.send: ", error);
          ShopifyAgent.UI.removeTypingIndicator();
          this.add(
            "Sorry, I couldn't process your request at the moment. Please try again later.",
            "model",
            messagesContainer,
          );
        }
      },

      add(messageContent, messageSender, messagesContainer) {
        const messageElement = document.createElement("div");

        messageElement.className = `max-w-[80%] px-4 py-3 rounded-md text-xl leading-snug break-words ${
          messageSender === "model"
            ? "bg-gray-100 text-gray-700 self-start"
            : "self-end bg-violet-500 text-white"
        }`;
        messageElement.textContent = messageContent;
        messagesContainer.appendChild(messageElement);

        ShopifyAgent.UI.scrollToBottom();
        return messageElement;
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
        const requestUrl = `${API_BASE_URL}/api/chat/send-message`;

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
          ShopifyAgent.UI.removeTypingIndicator();
          ShopifyAgent.Message.add(error.message, "model", messagesContainer);
          ShopifyAgent.Message.add(
            "Server error, please try again later.",
            "model",
            messagesContainer,
          );
        }
      },

      handleResponseEvent(event, messagesContainer) {
        const part = event.content?.parts?.[0];

        // Render model message
        if (part.text) {
          ShopifyAgent.Message.add(part.text, "model", messagesContainer);
        }

        // Refresh cart if cart tool triggered
        if (part.function_response?.name?.includes("cart")) {
          ShopifyAgent.UI.refreshCartUI();
        }

        ShopifyAgent.UI.removeTypingIndicator();
        ShopifyAgent.UI.scrollToBottom();
      },

      async fetchLatestSession(userId) {
        const requestUrl = `${API_BASE_URL}/api/chat/get-latest-session`;

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
        }
      },

      async fetchChatHistory(userId, sessionId, messagesContainer) {
        const loadingMessage = document.createElement("div");
        loadingMessage.className =
          "max-w-[80%] px-4 py-3 rounded-md text-xl leading-snug break-words bg-gray-100 text-gray-700 self-start";
        loadingMessage.textContent = "Loading conversation history...";
        messagesContainer.appendChild(loadingMessage);

        const requestUrl = `${API_BASE_URL}/api/chat/get-history`;

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
              const role = event.content?.role;
              const text = event.content?.parts?.[0]?.text;

              if (!text) return;

              if (role === "user") {
                const userMessage = ShopifyAgent.Util.extractUserMessage(text);
                ShopifyAgent.Message.add(userMessage, role, messagesContainer);
              } else {
                ShopifyAgent.Message.add(text, role, messagesContainer);
              }
            });
          }
        } catch (error) {
          console.error("Error in API.fetchChatHistory: ", error);
          messagesContainer.removeChild(loadingMessage);
          ShopifyAgent.Message.add(
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
        }
      },
    },

    Util: {
      extractUserMessage(message) {
        const parts = message.split("user_message=");
        return parts.length > 1 ? parts[1].trim() : message;
      },
    },

    async init() {
      const container = document.querySelector(".shopify-agent-container");
      if (!container) return;

      this.UI.init(container);
      this.UI.showTypingIndicator();

      // Check for existing conversation
      let userId = localStorage.getItem("shopifyAgentUserId");
      let cartId = sessionStorage.getItem("shopifyAgentCartId");
      let sessionId = sessionStorage.getItem("shopifyAgentSessionId");

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
        localStorage.setItem("shopifyAgentUserId", userId);

        this.UI.removeTypingIndicator();
        const welcomeMessage = "👋 Hi there! How can I help you today?";
        this.Message.add(
          welcomeMessage,
          "model",
          this.UI.elements.messagesContainer,
        );
        return;
      }

      // Handle new sessions
      if (!sessionId) {
        sessionId = await this.API.fetchLatestSession(userId);
        if (sessionId) {
          sessionStorage.setItem("shopifyAgentSessionId", sessionId);
          this.UI.removeTypingIndicator();
          await this.API.fetchChatHistory(
            userId,
            sessionId,
            this.UI.elements.messagesContainer,
          );
          return;
        } else {
          this.UI.removeTypingIndicator();
          const welcomeMessage = "👋 Hi there! How can I help you today?";
          this.Message.add(
            welcomeMessage,
            "model",
            this.UI.elements.messagesContainer,
          );
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
