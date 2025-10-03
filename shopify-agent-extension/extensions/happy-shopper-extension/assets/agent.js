(function () {
  const CONFIG = {
    API_BASE_URL:
      "https://shopify-agent-extension-412794838331.us-central1.run.app",
    STORAGE_KEYS: {
      USER_ID: "shopifyAgentUserId",
      CART_ID: "shopifyAgentCartId",
      SESSION_ID: "shopifyAgentSessionId",
      CHAT_OPEN: "shopifyAgentChatOpen",
      LATEST_PRODUCTS: "shopifyAgentLatestProducts",
    },
    TIMING: {
      FOCUS_DELAY: 300,
      KEYBOARD_DELAY: 500,
      SCROLL_DELAY: 100,
    },
    WELCOME_MESSAGE: "👋 Hi there! How can I help you today?",
    AGENT_AVATAR:
      "https://img.freepik.com/premium-vector/cute-robot-cartoon-vector-icon-illustration-techology-robot-icon-concept-isolated-premium-vector-flat-cartoon-style_138676-1474.jpg",
    USER_AVATAR:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTiLkC3N1FD4ShhqOCHpv03D00GR97kXfwmpw&s",
    SHOPIFY_URL: "https://ycgraphixs-dev.myshopify.com",
    THEME_COLOR: window.ShopifyAgentConfig?.THEME_COLOR,
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
          if (e.key === "Enter" && this.isInputValid()) {
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
          if (this.isInputValid()) {
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

      openChatWindow() {
        const { chatWindow, chatInput } = this.elements;

        chatWindow.classList.remove(
          "opacity-0",
          "pointer-events-none",
          "translate-y-2",
        );
        chatWindow.classList.add(
          "opacity-100",
          "pointer-events-auto",
          "translate-y-0",
        );

        sessionStorage.setItem(CONFIG.STORAGE_KEYS.CHAT_OPEN, "true");

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
      },

      closeChatWindow() {
        const { chatWindow, chatInput } = this.elements;

        chatWindow.classList.remove(
          "opacity-100",
          "pointer-events-auto",
          "translate-y-0",
        );
        chatWindow.classList.add(
          "opacity-0",
          "pointer-events-none",
          "translate-y-2",
        );

        sessionStorage.setItem(CONFIG.STORAGE_KEYS.CHAT_OPEN, "false");

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
      },

      toggleChatWindow() {
        const { chatWindow } = this.elements;
        const isOpen = chatWindow.classList.contains("opacity-100");
        if (isOpen) {
          this.closeChatWindow();
        } else {
          this.openChatWindow();
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

        const typingIndicator = ShopifyAgent.Util.createTypingIndicator();
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

      isInputValid() {
        const { chatInput, sendButton } = this.elements;

        return (
          chatInput.value.trim() !== "" &&
          !chatInput.disabled &&
          !sendButton.disabled
        );
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

          const newHeader = doc.querySelector("header");
          const currentHeader = document.querySelector("header");
          if (newHeader && currentHeader) {
            currentHeader.innerHTML = newHeader.innerHTML;
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
        this.addMessage(userMessage, "user", messagesContainer);
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
        const messageElement = ShopifyAgent.Util.createMessageElement(
          messageContent,
          messageSender,
        );
        messagesContainer.appendChild(messageElement);

        ShopifyAgent.UI.scrollToBottom();
      },

      addSuggestions(suggestions, messagesContainer) {
        const suggestionGroup =
          ShopifyAgent.Util.createSuggestionGroup(suggestions);
        messagesContainer.appendChild(suggestionGroup);

        ShopifyAgent.UI.scrollToBottom();
      },

      grayOutAllSuggestions(messagesContainer) {
        const suggestionGroups = messagesContainer.querySelectorAll(
          '[data-suggestion-group="true"]',
        );

        if (suggestionGroups.length === 0) return;

        suggestionGroups.forEach((group) => {
          const suggestionButtons = group.querySelectorAll("button");
          suggestionButtons.forEach((button) => {
            ShopifyAgent.Util.grayOutSuggestionButton(button);
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
              ShopifyAgent.Util.grayOutSuggestionButton(button);
            }
          });
        });
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

        if (part.function_response?.name === "search_shop_catalog") {
          try {
            const productContent =
              part.function_response.response.result.content[0].text;
            const parsedContent = JSON.parse(productContent);

            const products = parsedContent.products;

            if (products.length) {
              const currentProducts = ShopifyAgent.Util.getLatestProducts();

              const updatedProducts = [...currentProducts, ...products];

              ShopifyAgent.Util.setLatestProducts(updatedProducts);
            }
          } catch (error) {
            console.error(
              "Failed to parse search_shop_catalog payload: ",
              error,
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
        const loadingMessage = ShopifyAgent.Util.createMessageElement(
          "Loading conversation history...",
          "model",
        );
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
      extractUserMessage(userMessage) {
        const parts = userMessage.split("user_message=");
        return parts.length > 1 ? parts[1].trim() : userMessage;
      },

      showWelcomeMessage() {
        ShopifyAgent.UI.removeTypingIndicator();
        ShopifyAgent.Message.addMessage(
          CONFIG.WELCOME_MESSAGE,
          "model",
          ShopifyAgent.UI.elements.messagesContainer,
        );
      },

      createTypingIndicator() {
        const typingElement = document.createElement("div");
        typingElement.dataset.typingIndicator = "true";
        typingElement.className = "flex flex-col gap-0 items-start";

        const typingAvatar = this.createMessageAvator("model");

        const typingBubble = document.createElement("div");
        typingBubble.className = `relative text-md max-w-[83%] break-words rounded-md px-3.5 py-[10.625px] leading-snug agent-chat-bubble ml-10 border border-${CONFIG.THEME_COLOR}-700 bg-gray-100 text-gray-700 before:bg-gray-100 after:bg-${CONFIG.THEME_COLOR}-700`;

        typingBubble.innerHTML = `
          <div class="flex items-center gap-4 px-2">
            <div class="loading-animation relative h-5 w-5">
              <div class="loading-animation-dot absolute inset-0 h-full w-full before:bg-${CONFIG.THEME_COLOR}-500"></div>
              <div class="loading-animation-dot absolute inset-0 h-full w-full before:bg-${CONFIG.THEME_COLOR}-500"></div>
              <div class="loading-animation-dot absolute inset-0 h-full w-full before:bg-${CONFIG.THEME_COLOR}-500"></div>
              <div class="loading-animation-dot absolute inset-0 h-full w-full before:bg-${CONFIG.THEME_COLOR}-500"></div>
              <div class="loading-animation-dot absolute inset-0 h-full w-full before:bg-${CONFIG.THEME_COLOR}-500"></div>
              <div class="loading-animation-dot absolute inset-0 h-full w-full before:bg-${CONFIG.THEME_COLOR}-500"></div>
            </div>
            <span class="animate-thinking bg-gradient-to-r from-${CONFIG.THEME_COLOR}-200 via-${CONFIG.THEME_COLOR}-600 to-slate-50 bg-[length:200%_100%] bg-clip-text text-base font-semibold leading-snug text-transparent">
              Thinking
            </span>
          </div>
        `;

        typingElement.appendChild(typingAvatar);
        typingElement.appendChild(typingBubble);

        return typingElement;
      },

      createMessageElement(messageContent, messageSender) {
        const messageElement = document.createElement("div");
        messageElement.className = `flex flex-col gap-0 ${
          messageSender === "model" ? "items-start" : "items-end mt-2"
        }`;

        const messageAvator = this.createMessageAvator(messageSender);

        const messageBubble = this.createMessageBubble(
          messageContent,
          messageSender,
        );

        messageElement.appendChild(messageAvator);
        messageElement.appendChild(messageBubble);

        return messageElement;
      },

      createMessageAvator(messageSender) {
        const messageAvator = document.createElement("div");
        messageAvator.className = "flex gap-0";

        if (messageSender === "model") {
          messageAvator.innerHTML = `
            <img
              src="${CONFIG.AGENT_AVATAR}"
              alt="Shopify Agent Icon"
              class="h-10 w-10 rounded-full object-cover border border-${CONFIG.THEME_COLOR}-200"
              width="40px"
              height="40px"
            />
          `;
        } else {
          messageAvator.innerHTML = `
            <img
              src="${CONFIG.USER_AVATAR}"
              alt="Shopify Agent Icon"
              class="h-10 w-10 rounded-full object-cover border border-${CONFIG.THEME_COLOR}-200"
              width="40px"
              height="40px"
            />
          `;
        }

        return messageAvator;
      },

      createMessageBubble(messageContent, messageSender) {
        const messageBubble = document.createElement("div");
        messageBubble.className = `relative text-md max-w-[83%] break-words rounded-md px-3.5 py-3 leading-snug ${
          messageSender === "model"
            ? `agent-chat-bubble ml-10 border border-${CONFIG.THEME_COLOR}-700 bg-gray-100 text-gray-700 before:bg-gray-100 after:bg-${CONFIG.THEME_COLOR}-700`
            : `user-chat-bubble mr-10 border border-${CONFIG.THEME_COLOR}-500 bg-${CONFIG.THEME_COLOR}-500 text-white before:bg-${CONFIG.THEME_COLOR}-500 after:bg-${CONFIG.THEME_COLOR}-500`
        }`;

        if (messageSender !== "model") {
          messageBubble.innerHTML = this.formatMessageContent(messageContent);
        } else {
          const lines = messageContent.split(/\n+/).filter(Boolean);

          lines.forEach((line) => {
            const lineDiv = document.createElement("div");
            lineDiv.innerHTML = this.formatMessageContent(line);

            messageBubble.appendChild(lineDiv);

            const products = ShopifyAgent.Util.getLatestProducts();

            const product = products.find((product) =>
              line.includes(product.title),
            );

            if (product) {
              const productCard = ShopifyAgent.Util.createProductCard(product);
              messageBubble.appendChild(productCard);
            }
          });
        }

        return messageBubble;
      },

      createProductCard(product) {
        const minPrice = parseFloat(product.price_range.min);
        const maxPrice = parseFloat(product.price_range.max);

        let price;
        if (maxPrice === minPrice) {
          price = `${maxPrice}`;
        } else {
          price = `${minPrice} - ${maxPrice}`;
        }

        const productCard = document.createElement("div");
        productCard.className =
          "mt-2 flex cursor-pointer gap-2 rounded-md border bg-white p-2 text-sm";

        productCard.innerHTML = `
          <img src="${product.image_url}" class="h-12 w-12 rounded-md object-cover" />
          <div>
            <div class="font-semibold">${product.title}</div>
            <div class="text-${CONFIG.THEME_COLOR}-500">${price} ${product.price_range.currency}</div>
          </div>
        `;

        const slug = product.title
          .toLowerCase()
          .replace(/\s+/g, "-") // replace spaces with dashes
          .replace(/\./g, "-") // replace periods with dashes
          .replace(/'/g, "") // remove apostrophes
          .replace(/&/g, ""); // remove ampersands

        productCard.addEventListener("click", () => {
          const url = `${CONFIG.SHOPIFY_URL}/products/${slug}`;
          window.location.href = url;
        });

        return productCard;
      },

      createSuggestionGroup(suggestions) {
        const suggestionGroup = document.createElement("div");
        suggestionGroup.className = "flex flex-col gap-2";
        suggestionGroup.dataset.suggestionGroup = "true";

        suggestions.forEach((suggestion, index) => {
          const suggestionButton = document.createElement("button");
          suggestionButton.className = `ml-10 max-w-[83%] cursor-pointer rounded-md bg-${CONFIG.THEME_COLOR}-200 px-3.5 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-${CONFIG.THEME_COLOR}-300`;

          suggestionButton.innerHTML = this.formatMessageContent(suggestion);

          // Track which suggestion this is
          suggestionButton.dataset.suggestionIndex = index;

          // Store original text for sending
          suggestionButton.dataset.originalText = suggestion;

          suggestionButton.addEventListener("click", () => {
            // Update suggestion state before sending message
            this.updateSuggestionState(index, suggestionGroup);

            // Use original text for sending, not the formatted HTML
            ShopifyAgent.UI.elements.chatInput.value = suggestion;
            ShopifyAgent.Message.sendMessage(
              ShopifyAgent.UI.elements.chatInput,
              ShopifyAgent.UI.elements.messagesContainer,
            );
          });

          suggestionGroup.appendChild(suggestionButton);
        });
        return suggestionGroup;
      },

      updateSuggestionState(clickedIndex, suggestionGroup) {
        const suggestionButtons = suggestionGroup.querySelectorAll("button");

        suggestionButtons.forEach((button, index) => {
          if (index === clickedIndex) {
            // Keep clicked suggestion purple/active
            button.className = `ml-10 max-w-[83%] cursor-pointer rounded-md bg-${CONFIG.THEME_COLOR}-300 p-3 text-left text-sm text-white transition-colors`;
          } else {
            // Gray out other suggestions
            button.className =
              "ml-10 max-w-[83%] cursor-default rounded-md bg-gray-200 p-3 text-left text-sm text-slate-400 transition-colors";
            button.disabled = true;
          }
        });
      },

      grayOutSuggestionButton(suggestionButton) {
        suggestionButton.className =
          "ml-10 max-w-[83%] cursor-default rounded-md bg-gray-200 p-3 text-left text-sm text-slate-400 transition-colors";
        suggestionButton.disabled = true;
      },

      formatMessageContent(messageContent) {
        if (!messageContent) return "";

        let formatted = messageContent;

        // 1. Format links: [text](url) -> <a href="url">text</a>
        formatted = formatted.replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          `<a href="$2" target="_blank" rel="noopener noreferrer" class="text-${CONFIG.THEME_COLOR}-600 hover:text-${CONFIG.THEME_COLOR}-800 underline">$1</a>`,
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

      getLatestProducts() {
        const latestProducts = sessionStorage.getItem(
          CONFIG.STORAGE_KEYS.LATEST_PRODUCTS,
        );

        if (!latestProducts) {
          return [];
        }

        try {
          return JSON.parse(latestProducts);
        } catch (error) {
          console.error(
            "Failed to parse products from sessionStorage: ",
            error,
          );
          return [];
        }
      },

      setLatestProducts(products) {
        sessionStorage.setItem(
          CONFIG.STORAGE_KEYS.LATEST_PRODUCTS,
          JSON.stringify(products),
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
          sessionStorage.setItem(CONFIG.STORAGE_KEYS.CART_ID, cartId);
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

  ShopifyAgent.init();
})();
