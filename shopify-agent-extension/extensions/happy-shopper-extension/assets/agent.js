(function () {
  const ShopifyAgent = {
    UI: {
      elements: {},
      isMobile: false,

      init: function (container) {
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

        // Detect mobile device
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        // Set up event listeners
        this.setupEventListeners();
      },

      setupEventListeners: function () {
        const {
          chatBubble,
          closeButton,
          chatInput,
          sendButton,
          messagesContainer,
        } = this.elements;

        // Toggle chat window visibility
        chatBubble.addEventListener("click", () => this.toggleChatWindow());

        // Close chat window
        closeButton.addEventListener("click", () => this.closeChatWindow());

        // Send message when pressing Enter in input
        chatInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && chatInput.value.trim() !== "") {
            ShopifyAgent.Message.send(chatInput, messagesContainer);

            // On mobile, handle keyboard
            if (this.isMobile) {
              chatInput.blur();
              setTimeout(() => chatInput.focus(), 300);
            }
          }
        });

        // Send message when clicking send button
        sendButton.addEventListener("click", () => {
          if (chatInput.value.trim() !== "") {
            ShopifyAgent.Message.send(chatInput, messagesContainer);

            // On mobile, focus input after sending
            if (this.isMobile) {
              setTimeout(() => chatInput.focus(), 300);
            }
          }
        });

        // Handle window resize to adjust scrolling
        window.addEventListener("resize", () => this.scrollToBottom());
      },

      toggleChatWindow: function () {
        const { chatWindow, chatInput } = this.elements;

        chatWindow.classList.toggle("opacity-100");
        chatWindow.classList.toggle("pointer-events-auto");
        chatWindow.classList.toggle("translate-y-0");
        chatWindow.classList.toggle("opacity-0");
        chatWindow.classList.toggle("pointer-events-none");
        chatWindow.classList.toggle("translate-y-2");

        if (chatWindow.classList.contains("opacity-100")) {
          // On mobile, lock body scroll with Tailwind utilities
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
          // Always scroll messages to bottom when opening
          this.scrollToBottom();
        } else {
          // Remove body scroll lock
          document.body.classList.remove(
            "overflow-hidden",
            "fixed",
            "w-full",
            "h-full",
          );
        }
      },

      closeChatWindow: function () {
        const { chatWindow, chatInput } = this.elements;

        chatWindow.classList.toggle("opacity-100");
        chatWindow.classList.toggle("pointer-events-auto");
        chatWindow.classList.toggle("translate-y-0");
        chatWindow.classList.toggle("opacity-0");
        chatWindow.classList.toggle("pointer-events-none");
        chatWindow.classList.toggle("translate-y-2");

        // On mobile, blur input to hide keyboard and enable body scrolling
        if (this.isMobile) {
          chatInput.blur();
          document.body.classList.remove(
            "overflow-hidden",
            "fixed",
            "w-full",
            "h-full",
          );
        }
      },

      scrollToBottom() {
        const { messagesContainer } = this.elements;
        setTimeout(() => {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
      },

      showTypingIndicator: function () {
        const { messagesContainer } = this.elements;

        const typingIndicator = document.createElement("div");

        typingIndicator.setAttribute("data-typing-indicator", "true");

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

      removeTypingIndicator: function () {
        const { messagesContainer } = this.elements;

        const typingIndicator = messagesContainer.querySelector(
          '[data-typing-indicator="true"]',
        );

        if (typingIndicator) {
          typingIndicator.remove();
        }
      },
    },

    Message: {
      send: async function (chatInput, messagesContainer) {
        const userMessage = chatInput.value.trim();

        let userId = localStorage.getItem("shopifyAgentUserId");
        let sessionId = sessionStorage.getItem("shopifyAgentSessionId");

        // Add user message to chat
        this.add(userMessage, "user", messagesContainer);

        // Clear input
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
            sessionId,
            messagesContainer,
          );
        } catch (error) {
          console.error("API error:", error);
          ShopifyAgent.UI.removeTypingIndicator();
          this.add(
            "Sorry, I couldn't process your request at the moment. Please try again later.",
            "model",
            messagesContainer,
          );
        }
      },

      add: function (messageContent, messageSender, messagesContainer) {
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
      oneShotResponse: async function (
        userMessage,
        userId,
        sessionId,
        messagesContainer,
      ) {
        const API_URL = "http://localhost:3000/api/chat/send-message";

        try {
          const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: userMessage,
              user_id: userId,
              session_id: sessionId,
            }),
          });

          const data = await response.json();

          let modelMessageElement = document.createElement("div");
          modelMessageElement.className =
            "max-w-[80%] px-4 py-3 rounded-md text-xl leading-snug break-words bg-gray-100 text-gray-700 self-start";

          modelMessageElement.textContent = data.content.parts[0].text;
          messagesContainer.appendChild(modelMessageElement);

          ShopifyAgent.UI.removeTypingIndicator();
          ShopifyAgent.UI.scrollToBottom();
        } catch (error) {
          console.error("Error in oneShotResponse: ", error);
          ShopifyAgent.UI.removeTypingIndicator();
          ShopifyAgent.Message.add(
            "Server error, please try again later.",
            "model",
            messagesContainer,
          );
        }
      },

      fetchLatestSession: async function (userId) {
        const API_URL = "http://localhost:3000/api/chat/get-latest-session";

        try {
          const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
            }),
          });

          const data = await response.json();

          return data.output.sessions[0]?.id;
        } catch (error) {
          console.error("Error in fetchLatestSession: ", error);
        }
      },

      fetchChatHistory: async function (userId, session_id, messagesContainer) {
        const loadingMessage = document.createElement("div");
        loadingMessage.className =
          "max-w-[80%] px-4 py-3 rounded-md text-xl leading-snug break-words bg-gray-100 text-gray-700 self-start";
        loadingMessage.textContent = "Loading conversation history...";
        messagesContainer.appendChild(loadingMessage);

        const API_URL = "http://localhost:3000/api/chat/get-history";

        try {
          const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
              session_id: session_id,
            }),
          });

          const data = await response.json();
          messagesContainer.removeChild(loadingMessage);

          if (data?.output?.events?.length) {
            data.output.events.forEach((event) => {
              const role = event.content?.role;
              const text = event.content?.parts?.[0]?.text;

              if (text) {
                ShopifyAgent.Message.add(text, role, messagesContainer);
              }
            });
          }
        } catch (error) {
          console.error("Error in fetchChatHistory: ", error);
          messagesContainer.removeChild(loadingMessage);
          ShopifyAgent.Message.add(
            "Failed to load conversation history.",
            "model",
            messagesContainer,
          );
        }
      },
    },

    init: async function () {
      // Initialize UI
      const container = document.querySelector(".shopify-agent-container");
      if (!container) return;

      this.UI.init(container);

      // Check for existing conversation
      let userId = localStorage.getItem("shopifyAgentUserId");
      let sessionId = sessionStorage.getItem("shopifyAgentSessionId");

      if (!userId) {
        userId = "user-" + crypto.randomUUID();
        localStorage.setItem("shopifyAgentUserId", userId);

        const welcomeMessage = "👋 Hi there! How can I help you today?";
        this.Message.add(
          welcomeMessage,
          "model",
          this.UI.elements.messagesContainer,
        );
        return;
      }

      if (!sessionId) {
        sessionId = await this.API.fetchLatestSession(userId);
        if (sessionId) {
          sessionStorage.setItem("shopifyAgentSessionId", sessionId);
          await this.API.fetchChatHistory(
            userId,
            sessionId,
            this.UI.elements.messagesContainer,
          );
          return;
        } else {
          const welcomeMessage = "👋 Hi there! How can I help you today?";
          this.Message.add(
            welcomeMessage,
            "model",
            this.UI.elements.messagesContainer,
          );
          return;
        }
      }

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
