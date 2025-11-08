(function () {
  const CONFIG = {
    API_BASE_URL:
      "https://happy-shopper-extension-412794838331.us-central1.run.app",
    ADVISOR_STOP_FLAG: false,
    INTERVAL_ID: null,
    STORAGE_KEYS: {
      AGENT_CHAT_OPEN: "shopifyAgentChatOpen",
      AGENT_USER_ID: "shopifyAgentUserId",
      AGENT_SESSION_ID: "shopifyAgentSessionId",
      AGENT_LATEST_PRODUCTS: "shopifyAgentLatestProducts",
      ADVISOR_SESSION_ID: "shopifyAdvisorSessionId",
      ADVISOR_MESSAGE: "shopifyAdvisorMessage",
      ADVISOR_SUGGESTIONS: "shopifyAdvisorSuggestions",
    },
    TIMING: {
      INTERVAL_DELAY: 13000,
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
          chatInput: container.querySelector(".shopify-agent-input"),
          sendButton: container.querySelector(".shopify-agent-send"),
          messagesContainer: container.querySelector(".shopify-agent-messages"),
        };

        // Detect if on mobile device
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        // Set up event listeners
        this.setUpEventListeners();
      },

      setUpEventListeners() {
        const { chatBubble, closeButton, chatInput, sendButton } =
          this.elements;

        // Toggle chat when bubble clicked
        chatBubble.addEventListener("click", () => this.toggleChatWindow());

        // Close chat on close button
        closeButton.addEventListener("click", () => this.toggleChatWindow());

        // Send on enter key
        chatInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && this.isInputValid()) {
            ShopifyAgent.Message.sendMessageForAgent();

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
            ShopifyAgent.Message.sendMessageForAgent();

            // Focus input after sending on mobile
            if (this.isMobile) {
              setTimeout(() => chatInput.focus(), CONFIG.TIMING.FOCUS_DELAY);
            }
          }
        });

        // Keep messages pinned to bottom on resize
        window.addEventListener("resize", () => this.scrollToLastUserMessage());
      },

      toggleChatWindow() {
        const { chatWindow } = this.elements;
        const isOpen = chatWindow.classList.contains("opacity-100");
        if (isOpen) {
          this.closeChatWindow();
        } else {
          this.openChatWindow();
        }

        ShopifyAgent.Util.watchAgentChatState();
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

        ShopifyAgent.Util.setAgentChatState("true");

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
        this.scrollToLastUserMessage();
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

        ShopifyAgent.Util.setAgentChatState("false");

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

      scrollToLastUserMessage() {
        const { messagesContainer } = this.elements;

        setTimeout(() => {
          const lastUserMessage = [
            ...messagesContainer.querySelectorAll(".items-end"),
          ].pop();

          if (lastUserMessage) {
            lastUserMessage.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          } else {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }, CONFIG.TIMING.SCROLL_DELAY);
      },

      scrollToAdvisorMessage() {
        const { messagesContainer } = this.elements;

        setTimeout(() => {
          const advisorMessage = messagesContainer.querySelector(
            '[data-message-element-temp="true"]',
          );

          if (advisorMessage) {
            advisorMessage.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          } else {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }, CONFIG.TIMING.SCROLL_DELAY);
      },

      showTypingIndicator() {
        const { messagesContainer } = this.elements;

        const typingIndicator = ShopifyAgent.Util.createTypingIndicator();
        messagesContainer.appendChild(typingIndicator);

        this.scrollToLastUserMessage();
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

      enableInput() {
        const { chatInput, sendButton } = this.elements;

        chatInput.disabled = false;
        chatInput.placeholder = "Ask me anything...";
        chatInput.classList.remove("opacity-50", "cursor-not-allowed");

        sendButton.disabled = false;
        sendButton.classList.remove("opacity-50", "cursor-not-allowed");

        document.querySelectorAll(".agent-product-card").forEach((card) => {
          card.style.cursor = "pointer";
          card.classList.remove("opacity-50");
        });
      },

      disableInput() {
        const { chatInput, sendButton } = this.elements;

        chatInput.disabled = true;
        chatInput.placeholder = "Waiting for response...";
        chatInput.classList.add("opacity-50", "cursor-not-allowed");

        sendButton.disabled = true;
        sendButton.classList.add("opacity-50", "cursor-not-allowed");

        document.querySelectorAll(".agent-product-card").forEach((card) => {
          card.style.cursor = "not-allowed";
          card.classList.add("opacity-50");
        });
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
          console.error("Something went wrong in UI.refreshCartUI: ", error);
        }
      },
    },

    Message: {
      async sendMessageForAgent() {
        const { chatInput } = ShopifyAgent.UI.elements;

        this.grayOutAllSuggestionsForAgent();

        // Add user message to chat and clear input
        const userMessage = chatInput.value.trim();
        this.addMessageForAgent(userMessage, "user", null, null);
        chatInput.value = "";

        // Show typing indicator
        ShopifyAgent.UI.showTypingIndicator();

        const agentUserId = ShopifyAgent.Util.getAgentUserId();
        const agentSessionId = ShopifyAgent.Util.getAgentSessionId();
        const advisorMessageElement = document.querySelector(
          '[data-message-element-temp="true"]',
        );
        const advisorSggestionGroup = document.querySelector(
          "[data-suggestion-group-temp='true']",
        );

        if (advisorMessageElement && advisorSggestionGroup) {
          delete advisorMessageElement.dataset.messageElementTemp;
          delete advisorSggestionGroup.dataset.suggestionGroupTemp;

          const advisorMessage = ShopifyAgent.Util.getAdvisorMessage();
          const advisorSuggestions = ShopifyAgent.Util.getAdvisorSuggestions();

          await ShopifyAgent.API.injectAgentMessageFromAdvisor(
            agentSessionId,
            advisorMessage,
            advisorSuggestions,
          );

          ShopifyAgent.Util.removeAdvisorMessage();
          ShopifyAgent.Util.removeAdvisorSuggestions();
        }

        await ShopifyAgent.API.oneShotResponseForAgent(
          agentUserId,
          agentSessionId,
          userMessage,
        );
      },

      addMessageForAgent(
        messageContent,
        messageSender,
        productComponent,
        tableComponent,
      ) {
        const { messagesContainer } = ShopifyAgent.UI.elements;

        const lines = messageContent
          .replace(/\\n/g, "\n")
          .split(/\n+/)
          .filter(Boolean);

        for (let i = 0; i < lines.length; i++) {
          const lineChunk = lines[i];

          let messageElement;

          if (i === 0) {
            messageElement = ShopifyAgent.Util.createMessageElementForAgent(
              lineChunk,
              messageSender,
              productComponent,
              tableComponent,
            );
          } else {
            messageElement = ShopifyAgent.Util.createMessageElementForAgent(
              lineChunk,
              messageSender,
            );
          }

          messagesContainer.appendChild(messageElement);
        }

        ShopifyAgent.UI.scrollToLastUserMessage();
      },

      addMessageForAgentFromAdvisor(messageContent) {
        const { messagesContainer } = ShopifyAgent.UI.elements;

        const messageElement = ShopifyAgent.Util.createMessageElementForAgent(
          messageContent,
          "model",
          null,
          null,
        );

        messageElement.dataset.messageElementTemp = "true";

        messagesContainer.appendChild(messageElement);
      },

      removeMessageForAgentFromAdvisor() {
        const messageElement = document.querySelector(
          '[data-message-element-temp="true"]',
        );

        if (messageElement) {
          messageElement.remove();
        }
      },

      addSuggestionsForAgent(suggestions) {
        const { messagesContainer } = ShopifyAgent.UI.elements;

        const suggestionGroup =
          ShopifyAgent.Util.createSuggestionGroupForAgent(suggestions);

        messagesContainer.appendChild(suggestionGroup);

        ShopifyAgent.UI.scrollToLastUserMessage();
      },

      addSuggestionsForAgentFromAdvisor(suggestions) {
        const { messagesContainer } = ShopifyAgent.UI.elements;

        const suggestionGroup =
          ShopifyAgent.Util.createSuggestionGroupForAgent(suggestions);

        suggestionGroup.dataset.suggestionGroupTemp = "true";

        messagesContainer.appendChild(suggestionGroup);

        ShopifyAgent.UI.scrollToAdvisorMessage();
      },

      removeSuggestionsForAgentFromAdvisor() {
        const suggestionGroup = document.querySelector(
          '[data-suggestion-group-temp="true"]',
        );

        if (suggestionGroup) {
          suggestionGroup.remove();
        }
      },

      grayOutAllSuggestionsForAgent() {
        const { messagesContainer } = ShopifyAgent.UI.elements;

        const suggestionGroups = messagesContainer.querySelectorAll(
          '[data-suggestion-group="true"]',
        );

        if (suggestionGroups.length === 0) return;

        suggestionGroups.forEach((group) => {
          const suggestionButtons = group.querySelectorAll("button");
          suggestionButtons.forEach((button) => {
            if (button.classList.contains(`bg-${CONFIG.THEME_COLOR}-300`)) {
              return;
            }

            ShopifyAgent.Util.grayOutSuggestionButtonForAgent(button);
          });
        });
      },

      grayOutHistoricalSuggestionsForAgent() {
        const { messagesContainer } = ShopifyAgent.UI.elements;

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
              ShopifyAgent.Util.grayOutSuggestionButtonForAgent(button);
            }
          });
        });
      },

      parseMessageContentForAgent(messageContent) {
        try {
          if (messageContent.message) {
            this.addMessageForAgent(
              messageContent.message,
              "model",
              messageContent?.productComponent,
              messageContent?.tableComponent,
            );
          }

          if (messageContent.suggestions.payload.length > 0) {
            this.addSuggestionsForAgent(messageContent.suggestions.payload);
          }
        } catch (error) {
          console.error(
            "Something went wrong in Message.parseMessageContentForAgent: ",
            error,
          );
          this.addMessageForAgent(
            "Sorry, our connection just got disconnected for a second. Could you please try again?",
            "model",
            null,
            null,
          );
        }
      },

      addMessageForAdvisor(messageContent) {
        const { container } = ShopifyAgent.UI.elements;
        const { message, suggestions } = messageContent;

        const messageBubble =
          ShopifyAgent.Util.createMessageBubbleForAdvisor(message);

        if (CONFIG.ADVISOR_STOP_FLAG) return;

        ShopifyAgent.Util.setAdvisorMessage(message);
        ShopifyAgent.Util.setAdvisorSuggestions(suggestions);

        container.appendChild(messageBubble);
      },

      removeMessageForAdvisor() {
        const messageBubble = document.querySelector(".advisor-chat-bubble");

        if (messageBubble) {
          messageBubble.remove();
        }
      },

      parseMessageContentForAdvisor(messageContent) {
        try {
          const parsedContent = JSON.parse(messageContent);

          if (parsedContent.message && parsedContent.suggestions) {
            this.addMessageForAdvisor(parsedContent);
          }
        } catch (error) {
          console.error(
            "Something went wrong in Message.parseMessageContentForAdvisor: ",
            error,
          );
        }
      },

      generateUserMessageForAdvisor(shopifyHandle) {
        switch (true) {
          case shopifyHandle.includes("/collections/all"): {
            return "I am on the products catalog page.";
          }

          case shopifyHandle.includes("/products/"): {
            const product = shopifyHandle.split("/products/")[1]?.split("?")[0];
            return `I am looking for ${product.replace(/-/g, " ")}.`;
          }

          case shopifyHandle.includes("/pages/"): {
            const page = shopifyHandle.split("/pages/")[1];
            return `I am on the ${page.replace(/-/g, " ")} page.`;
          }

          case shopifyHandle.includes("/policies/"): {
            const policy = shopifyHandle.split("/policies/")[1];
            return `I am on the ${policy.replace(/-/g, " ")} policy page.`;
          }

          case shopifyHandle.includes("/account/"): {
            const accountPage = shopifyHandle.split("/account/")[1] || "main";
            return `I am on the account ${accountPage.replace(/-/g, " ")} page.`;
          }

          case shopifyHandle.includes("/search"): {
            const searchTerm =
              shopifyHandle.split("/search?q=")[1].split("&")[0] || "";

            return searchTerm
              ? `I am on the search page looking for ${searchTerm}.`
              : "I am on the search page.";
          }

          default:
            return "I am on the home page.";
        }
      },
    },

    API: {
      async injectAgentMessage(agentSessionId, agentMessage) {
        const requestUrl = `${CONFIG.API_BASE_URL}/api/chat/${agentSessionId}/inject-agent-message`;

        try {
          await fetch(requestUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: agentMessage,
            }),
          });

          ShopifyAgent.Message.addMessageForAgent(
            agentMessage,
            "model",
            null,
            null,
          );
        } catch (error) {
          console.error(
            "Something went wrong in API.injectAgentMessage: ",
            error,
          );
        }
      },

      async injectAgentMessageFromAdvisor(
        agentSessionId,
        advisorMessage,
        advisorSuggestions,
      ) {
        const requestUrl = `${CONFIG.API_BASE_URL}/api/chat/${agentSessionId}/inject-agent-message-from-advisor`;

        try {
          await fetch(requestUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: advisorMessage,
              suggestions: advisorSuggestions,
            }),
          });
        } catch (error) {
          console.error(
            "Something went wrong in API.injectAgentMessageFromAdvisor: ",
            error,
          );
        }
      },

      async oneShotResponseForAgent(agentUserId, agentSessionId, userMessage) {
        const requestUrl = `${CONFIG.API_BASE_URL}/api/chat/${agentUserId}/${agentSessionId}/send-agent-message`;

        try {
          const response = await fetch(requestUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: userMessage,
            }),
          });

          const reader = response.body.getReader();
          const decoder = new TextDecoder("utf-8");

          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n\n");

            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i].trim();

              if (line.startsWith("data:")) {
                const rawEvent = line.replace(/^data:\s*/, "");
                const parsedEvent = JSON.parse(rawEvent);

                this.handleResponseEventForAgent(parsedEvent);
              }
            }

            buffer = lines[lines.length - 1];
          }

          ShopifyAgent.UI.removeTypingIndicator();
        } catch (error) {
          console.error(
            "Something went wrong in API.oneShotResponseForAgent: ",
            error,
          );
          ShopifyAgent.UI.removeTypingIndicator();
          ShopifyAgent.Message.addMessageForAgent(
            "Sorry, I couldn't process your request at the moment. Please try again later.",
            "model",
            null,
            null,
          );
        }
      },

      handleResponseEventForAgent(event) {
        event.content?.parts?.forEach((part) => {
          if (part.function_call?.name === "set_model_response") {
            ShopifyAgent.Message.parseMessageContentForAgent(
              part.function_call?.args,
            );
          }

          if (part.function_response?.name === "search_shop_catalog") {
            try {
              const productContent =
                part.function_response.response.content[0].text;
              const parsedContent = JSON.parse(productContent);

              const products = parsedContent.products;

              if (products.length) {
                const currentProducts =
                  ShopifyAgent.Util.getAgentLatestProducts();

                const combinedProducts = [...currentProducts, ...products];

                const productsMap = new Map();

                for (const product of combinedProducts) {
                  productsMap.set(product.product_id, product);
                }

                const uniqueProducts = Array.from(productsMap.values());

                ShopifyAgent.Util.setAgentLatestProducts(uniqueProducts);
              }
            } catch (error) {
              console.error(
                "Something went wrong in API.handleResponseEventForAgent (search_shop_catalog): ",
                error,
              );
            }
          }

          // Refresh cart if cart tool triggered
          if (part.function_response?.name?.includes("cart")) {
            ShopifyAgent.UI.refreshCartUI();
          }
        });
      },

      async createSessionForAgent(agentUserId, cartId) {
        const requestUrl = `${CONFIG.API_BASE_URL}/api/chat/${agentUserId}/create-agent-session`;

        try {
          const response = await fetch(requestUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cart_id: cartId,
            }),
          });

          const { data } = await response.json();

          return data?.sessionId;
        } catch (error) {
          console.error(
            "Something went wrong in API.createSessionForAgent: ",
            error,
          );
          return null;
        }
      },

      async fetchLatestSessionForAgent(agentUserId) {
        const requestUrl = `${CONFIG.API_BASE_URL}/api/chat/${agentUserId}/latest-agent-session`;

        try {
          const response = await fetch(requestUrl, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          const { data } = await response.json();

          return data?.latestSessionId;
        } catch (error) {
          console.error(
            "Something went wrong in API.fetchLatestSessionForAgent: ",
            error,
          );
          return null;
        }
      },

      async fetchChatHistoryForAgent(agentSessionId) {
        const { messagesContainer } = ShopifyAgent.UI.elements;

        const loadingMessage = ShopifyAgent.Util.createMessageElementForAgent(
          "Loading conversation history...",
          "model",
          null,
          null,
        );
        messagesContainer.appendChild(loadingMessage);

        const requestUrl = `${CONFIG.API_BASE_URL}/api/chat/${agentSessionId}/agent-history`;

        try {
          const response = await fetch(requestUrl, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          const { data } = await response.json();
          messagesContainer.removeChild(loadingMessage);

          // Render past messages
          if (data?.sessionEvents?.length) {
            data?.sessionEvents.forEach((event) => {
              const role = event.content?.role;
              const text = event.content?.parts?.text;

              if (!text) return;

              if (role === "user") {
                ShopifyAgent.Message.addMessageForAgent(text, role, null, null);
              }

              if (role === "model") {
                ShopifyAgent.Message.parseMessageContentForAgent(
                  JSON.parse(text),
                );
              }
            });

            ShopifyAgent.Message.grayOutHistoricalSuggestionsForAgent();
          }
        } catch (error) {
          console.error(
            "Something went wrong in API.fetchChatHistory: ",
            error,
          );
          messagesContainer.removeChild(loadingMessage);
          ShopifyAgent.Message.addMessageForAgent(
            "Failed to load conversation history.",
            "model",
            null,
            null,
          );
        }
      },

      async oneShotResponseForAdvisor(
        agentUserId,
        advisorSessionId,
        userMessage,
      ) {
        const requestUrl = `${CONFIG.API_BASE_URL}/api/chat/${agentUserId}/${advisorSessionId}/send-advisor-message`;

        try {
          const response = await fetch(requestUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: userMessage,
            }),
          });

          const reader = response.body.getReader();
          const decoder = new TextDecoder("utf-8");

          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n\n");

            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i].trim();

              if (line.startsWith("data:")) {
                const rawEvent = line.replace(/^data:\s*/, "");
                const parsedEvent = JSON.parse(rawEvent);

                this.handleResponseEventForAdvisor(parsedEvent);
              }
            }

            buffer = lines[lines.length - 1];
          }
        } catch (error) {
          console.error(
            "Something went wrong in API.oneShotResponseForAdvisor: ",
            error,
          );
        }
      },

      handleResponseEventForAdvisor(event) {
        const part = event.content?.parts?.[0];

        if (part.text) {
          ShopifyAgent.Message.parseMessageContentForAdvisor(part.text);
        }
      },

      async createSessionForAdvisor(agentUserId) {
        const requestUrl = `${CONFIG.API_BASE_URL}/api/chat/${agentUserId}/create-advisor-session`;

        try {
          const response = await fetch(requestUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          const { data } = await response.json();

          return data?.sessionId;
        } catch (error) {
          console.error(
            "Something went wrong in API.createSessionForAdvisor: ",
            error,
          );
          return null;
        }
      },

      async fetchLatestSessionForAdvisor(agentUserId) {
        const requestUrl = `${CONFIG.API_BASE_URL}/api/chat/${agentUserId}/latest-advisor-session`;

        try {
          const response = await fetch(requestUrl, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          const { data } = await response.json();

          return data?.latestSessionId;
        } catch (error) {
          console.error(
            "Something went wrong in API.fetchLatestSessionForAdvisor: ",
            error,
          );
          return null;
        }
      },

      async fetchFirstProductVariantID() {
        try {
          const response = await fetch("/products.json?limit=1");
          const data = await response.json();
          return data.products[0].variants[0].id;
        } catch (error) {
          console.error(
            "Something went wrong in API.fetchFirstProductID: ",
            error,
          );
          return null;
        }
      },

      async fetchCartId() {
        try {
          const response = await fetch("/cart.js");
          const data = await response.json();
          return data.token;
        } catch (error) {
          console.error("Something went wrong in API.fetchCartId: ", error);
          return null;
        }
      },

      async updateCartId() {
        const productVariantId = await this.fetchFirstProductVariantID();

        try {
          const response = await fetch("/cart/add.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: [
                {
                  id: productVariantId,
                  quantity: 0,
                },
              ],
            }),
          });
          await response.json();

          return await this.fetchCartId();
        } catch (error) {
          console.error("Something went wrong in API.updateCartId: ", error);
          return null;
        }
      },
    },

    Util: {
      createTypingIndicator() {
        const typingElement = document.createElement("div");
        typingElement.dataset.typingIndicator = "true";
        typingElement.className = "flex flex-col gap-0 items-start";

        const typingAvatar = this.createMessageAvatarForAgent("model");

        const typingBubble = document.createElement("div");
        typingBubble.className = `relative max-w-[83%] break-words rounded-md px-3.5 py-[10.625px] leading-snug agent-chat-bubble ml-10 border border-${CONFIG.THEME_COLOR}-700 bg-gray-100 text-gray-700 before:bg-gray-100 after:bg-${CONFIG.THEME_COLOR}-700`;

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
              Thinking Deeply
            </span>
          </div>
        `;

        typingElement.appendChild(typingAvatar);
        typingElement.appendChild(typingBubble);

        return typingElement;
      },

      createMessageElementForAgent(
        messageContent,
        messageSender,
        productComponent,
        tableComponent,
      ) {
        const messageElement = document.createElement("div");
        messageElement.className = `flex flex-col gap-0 ${
          messageSender === "model" ? "items-start" : "items-end pt-2"
        }`;

        const messageAvatar = this.createMessageAvatarForAgent(messageSender);

        const messageBubble = this.createMessageBubbleForAgent(
          messageContent,
          messageSender,
          productComponent,
          tableComponent,
        );

        messageElement.appendChild(messageAvatar);
        messageElement.appendChild(messageBubble);

        return messageElement;
      },

      createMessageAvatarForAgent(messageSender) {
        const messageAvatar = document.createElement("div");
        messageAvatar.className = "flex gap-0";

        if (messageSender === "model") {
          messageAvatar.innerHTML = `
            <img
              src="${CONFIG.AGENT_AVATAR}"
              alt="Shopify Agent Icon"
              class="h-10 w-10 rounded-full object-cover border border-${CONFIG.THEME_COLOR}-200"
              width="40px"
              height="40px"
            />
          `;
        } else {
          messageAvatar.innerHTML = `
            <img
              src="${CONFIG.USER_AVATAR}"
              alt="Shopify User Icon"
              class="h-10 w-10 rounded-full object-cover border border-${CONFIG.THEME_COLOR}-200"
              width="40px"
              height="40px"
            />
          `;
        }

        return messageAvatar;
      },

      createMessageBubbleForAgent(
        messageContent,
        messageSender,
        productComponent,
        tableComponent,
      ) {
        const messageBubble = document.createElement("div");
        messageBubble.className = `relative text-sm max-w-[83%] break-words rounded-md px-3.5 py-3 leading-snug ${
          messageSender === "model"
            ? `agent-chat-bubble ml-10 border border-${CONFIG.THEME_COLOR}-700 bg-gray-100 text-gray-700 before:bg-gray-100 after:bg-${CONFIG.THEME_COLOR}-700`
            : `user-chat-bubble mr-10 border border-${CONFIG.THEME_COLOR}-500 bg-${CONFIG.THEME_COLOR}-500 text-white before:bg-${CONFIG.THEME_COLOR}-500 after:bg-${CONFIG.THEME_COLOR}-500`
        }`;

        messageBubble.innerHTML = this.formatMessageContent(messageContent);

        if (messageSender === "model") {
          if (tableComponent) {
            const table = this.createComparisonTableForAgent(
              tableComponent.headers,
              tableComponent.rows,
            );
            messageBubble.appendChild(table);

            const tableSummary = document.createElement("div");
            tableSummary.innerHTML = this.formatMessageContent(
              tableComponent.summary,
            );

            messageBubble.appendChild(tableSummary);
          } else if (productComponent) {
            const messageProducts = productComponent.items;
            const products = ShopifyAgent.Util.getAgentLatestProducts();

            const matchedProducts = products.filter((product) =>
              messageProducts.some(
                (productTitle) =>
                  productTitle.trim().toLowerCase() ===
                  product.title.trim().toLowerCase(),
              ),
            );

            if (matchedProducts.length > 0) {
              matchedProducts.forEach((product) => {
                const productCard =
                  ShopifyAgent.Util.createProductCardForAgent(product);
                messageBubble.appendChild(productCard);
              });
            }
          }
        }

        return messageBubble;
      },

      createMessageBubbleForAdvisor(messageContent) {
        const messageBubble = document.createElement("div");
        messageBubble.className = `advisor-chat-bubble absolute bottom-2/3 right-full w-56 break-words rounded-md border border-${CONFIG.THEME_COLOR}-700 bg-gray-100 px-3.5 py-3 text-sm leading-snug text-gray-700 before:bg-gray-100 after:bg-${CONFIG.THEME_COLOR}-700`;

        messageBubble.innerHTML = this.formatMessageContent(messageContent);

        return messageBubble;
      },

      createProductCardForAgent(product) {
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
          "agent-product-card mt-2 flex cursor-pointer gap-2 rounded-md border bg-white p-2 text-sm";

        productCard.innerHTML = `
          <img src="${product.image_url}" class="h-12 w-12 rounded-md object-cover" />
          <div>
            <div class="font-semibold">${product.title}</div>
            <div class="text-${CONFIG.THEME_COLOR}-500">${price} ${product.price_range.currency}</div>
          </div>
        `;

        const slug = product.title
          .toLowerCase()
          .replace(/'/g, "") // remove apostrophes
          .replace(/&/g, "") // remove ampersands
          .replace(/\+/g, "") // remove plus signs
          .replace(/\s+/g, "-") // replace spaces with dashes
          .replace(/\./g, "-") // replace periods with dashes
          .replace(/^-+|-+$/g, "") // remove leading/trailing dashes
          .replace(/-{2,}/g, "-"); // collapse multiple dashes into one

        productCard.addEventListener("click", () => {
          const chatInput = ShopifyAgent.UI.elements.chatInput;

          if (chatInput.disabled) {
            return;
          }

          const url = `${CONFIG.SHOPIFY_URL}/products/${slug}`;
          window.location.href = url;
        });

        return productCard;
      },

      createComparisonTableForAgent(tableHeaders, tableRows) {
        const comparisonTableWrapper = document.createElement("div");
        comparisonTableWrapper.style.scrollbarWidth = "thin";
        comparisonTableWrapper.className = "overflow-x-auto mt-2 mb-3";

        const comparisonTable = document.createElement("table");
        comparisonTable.className =
          "agent-comparison-table border border-black bg-white";

        const thead = document.createElement("thead");
        thead.className = "bg-gray-200";

        const tr = document.createElement("tr");
        tableHeaders.forEach((headerText, index) => {
          const th = document.createElement("th");
          th.textContent = headerText;
          th.className =
            "border-r border-black px-2.5 py-1.5 font-semibold text-black text-xs";

          if (index > 0) {
            th.classList.add("text-center");
          } else {
            th.classList.add("text-left");
          }

          tr.appendChild(th);
        });
        thead.appendChild(tr);

        const tbody = document.createElement("tbody");
        tableRows.forEach((row) => {
          const tr = document.createElement("tr");
          tr.className = "border-t border-black";

          row.forEach((cell, index) => {
            const td = document.createElement("td");
            td.textContent = cell;
            td.className =
              "border-r border-black px-2.5 py-1.5 font-medium text-black text-xxs";

            if (index > 0) {
              td.classList.add("text-center");
            } else {
              td.classList.add("text-left");
            }
            tr.appendChild(td);
          });

          tbody.appendChild(tr);
        });

        comparisonTable.appendChild(thead);
        comparisonTable.appendChild(tbody);
        comparisonTableWrapper.appendChild(comparisonTable);

        return comparisonTableWrapper;
      },

      createSuggestionGroupForAgent(suggestions) {
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

          suggestionButton.addEventListener("click", async () => {
            // Update suggestion state before sending message
            this.updateSuggestionStateForAgent(index, suggestionGroup);

            // Use original text for sending, not the formatted HTML
            ShopifyAgent.UI.elements.chatInput.value = suggestion;
            await ShopifyAgent.Message.sendMessageForAgent();
          });

          suggestionGroup.appendChild(suggestionButton);
        });
        return suggestionGroup;
      },

      updateSuggestionStateForAgent(clickedIndex, suggestionGroup) {
        const suggestionButtons = suggestionGroup.querySelectorAll("button");

        suggestionButtons.forEach((button, index) => {
          if (index === clickedIndex) {
            // Keep clicked suggestion purple
            button.className = `ml-10 max-w-[83%] cursor-default rounded-md bg-${CONFIG.THEME_COLOR}-300 p-3 text-left text-sm text-white transition-colors`;
            button.disabled = true;
          } else {
            // Gray out other suggestions
            button.className =
              "ml-10 max-w-[83%] cursor-default rounded-md bg-gray-200 p-3 text-left text-sm text-slate-400 transition-colors";
            button.disabled = true;
          }
        });
      },

      grayOutSuggestionButtonForAgent(suggestionButton) {
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

        return formatted;
      },

      startAdvisor() {
        // Prevent duplicate intervals
        if (CONFIG.INTERVAL_ID) return;

        CONFIG.INTERVAL_ID = setInterval(async () => {
          // If advisor is stopped, skip this cycle
          if (CONFIG.ADVISOR_STOP_FLAG) return;

          const isChatOpen = this.getAgentChatState() === "true";

          ShopifyAgent.Message.removeMessageForAdvisor();

          if (isChatOpen) {
            const chatInput = ShopifyAgent.UI.elements.chatInput;

            if (!chatInput.disabled) {
              const advisorMessage = this.getAdvisorMessage();
              const advisorSuggestions = this.getAdvisorSuggestions();

              if (advisorMessage && advisorSuggestions) {
                ShopifyAgent.Message.addMessageForAgentFromAdvisor(
                  advisorMessage,
                );
                ShopifyAgent.Message.addSuggestionsForAgentFromAdvisor(
                  advisorSuggestions,
                );
                ShopifyAgent.Message.grayOutHistoricalSuggestionsForAgent();
              }
            }

            CONFIG.ADVISOR_STOP_FLAG = true;
            clearInterval(CONFIG.INTERVAL_ID);
            CONFIG.INTERVAL_ID = null;
            return;
          }

          ShopifyAgent.Message.removeMessageForAgentFromAdvisor();
          ShopifyAgent.Message.removeSuggestionsForAgentFromAdvisor();

          const agentUserId = this.getAgentUserId();
          const advisorSessionId = this.getAdvisorSessionId();

          if (CONFIG.ADVISOR_STOP_FLAG) return;

          const shopifyHandle = this.getShopifyHandle();
          const userMessage =
            ShopifyAgent.Message.generateUserMessageForAdvisor(shopifyHandle);
          await ShopifyAgent.API.oneShotResponseForAdvisor(
            agentUserId,
            advisorSessionId,
            userMessage,
          );
        }, CONFIG.TIMING.INTERVAL_DELAY);
      },

      watchAgentChatState() {
        const isChatOpen = this.getAgentChatState() === "true";

        if (isChatOpen && CONFIG.INTERVAL_ID) {
          ShopifyAgent.Message.removeMessageForAdvisor();

          const chatInput = ShopifyAgent.UI.elements.chatInput;

          if (!chatInput.disabled) {
            const advisorMessage = this.getAdvisorMessage();
            const advisorSuggestions = this.getAdvisorSuggestions();

            if (advisorMessage && advisorSuggestions) {
              ShopifyAgent.Message.addMessageForAgentFromAdvisor(
                advisorMessage,
              );
              ShopifyAgent.Message.addSuggestionsForAgentFromAdvisor(
                advisorSuggestions,
              );
              ShopifyAgent.Message.grayOutHistoricalSuggestionsForAgent();
            }
          }

          CONFIG.ADVISOR_STOP_FLAG = true;
          clearInterval(CONFIG.INTERVAL_ID);
          CONFIG.INTERVAL_ID = null;
        } else if (!isChatOpen && !CONFIG.INTERVAL_ID) {
          ShopifyAgent.Message.removeMessageForAgentFromAdvisor();
          ShopifyAgent.Message.removeSuggestionsForAgentFromAdvisor();

          CONFIG.ADVISOR_STOP_FLAG = false;
          this.startAdvisor();
        }
      },

      getShopifyHandle() {
        const { pathname } = window.location;

        return pathname;
      },

      getAgentChatState() {
        const agentChatState = sessionStorage.getItem(
          CONFIG.STORAGE_KEYS.AGENT_CHAT_OPEN,
        );

        if (!agentChatState) {
          return null;
        }

        return agentChatState;
      },

      getAgentUserId() {
        const agentUserId = localStorage.getItem(
          CONFIG.STORAGE_KEYS.AGENT_USER_ID,
        );

        if (!agentUserId) {
          return null;
        }

        return agentUserId;
      },

      getAgentSessionId() {
        const agentSessionId = sessionStorage.getItem(
          CONFIG.STORAGE_KEYS.AGENT_SESSION_ID,
        );

        if (!agentSessionId) {
          return null;
        }

        return agentSessionId;
      },

      getAgentLatestProducts() {
        const agentLatestProducts = sessionStorage.getItem(
          CONFIG.STORAGE_KEYS.AGENT_LATEST_PRODUCTS,
        );

        if (!agentLatestProducts) {
          return [];
        }

        try {
          return JSON.parse(agentLatestProducts);
        } catch (error) {
          console.error(
            "Something went wrong in Util.getAgentLatestProducts: ",
            error,
          );
          return [];
        }
      },

      getAdvisorSessionId() {
        const advisorSessionId = sessionStorage.getItem(
          CONFIG.STORAGE_KEYS.ADVISOR_SESSION_ID,
        );

        if (!advisorSessionId) {
          return null;
        }

        return advisorSessionId;
      },

      getAdvisorMessage() {
        const advisorMessage = sessionStorage.getItem(
          CONFIG.STORAGE_KEYS.ADVISOR_MESSAGE,
        );

        if (!advisorMessage) {
          return null;
        }

        return advisorMessage;
      },

      getAdvisorSuggestions() {
        const advisorSuggestions = sessionStorage.getItem(
          CONFIG.STORAGE_KEYS.ADVISOR_SUGGESTIONS,
        );

        if (!advisorSuggestions) {
          return [];
        }

        try {
          return JSON.parse(advisorSuggestions);
        } catch (error) {
          console.error(
            "Something went wrong in Util.getAdvisorSuggestions: ",
            error,
          );
          return [];
        }
      },

      setAgentChatState(agentChatState) {
        sessionStorage.setItem(
          CONFIG.STORAGE_KEYS.AGENT_CHAT_OPEN,
          agentChatState,
        );
      },

      setAgentUserId(agentUserId) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.AGENT_USER_ID, agentUserId);
      },

      setAgentSessionId(agentSessionId) {
        sessionStorage.setItem(
          CONFIG.STORAGE_KEYS.AGENT_SESSION_ID,
          agentSessionId,
        );
      },

      setAgentLatestProducts(agentLatestProducts) {
        sessionStorage.setItem(
          CONFIG.STORAGE_KEYS.AGENT_LATEST_PRODUCTS,
          JSON.stringify(agentLatestProducts),
        );
      },

      setAdvisorSessionId(advisorSessionId) {
        sessionStorage.setItem(
          CONFIG.STORAGE_KEYS.ADVISOR_SESSION_ID,
          advisorSessionId,
        );
      },

      setAdvisorMessage(advisorMessage) {
        sessionStorage.setItem(
          CONFIG.STORAGE_KEYS.ADVISOR_MESSAGE,
          advisorMessage,
        );
      },

      setAdvisorSuggestions(advisorSuggestions) {
        sessionStorage.setItem(
          CONFIG.STORAGE_KEYS.ADVISOR_SUGGESTIONS,
          JSON.stringify(advisorSuggestions),
        );
      },

      removeAdvisorMessage() {
        sessionStorage.removeItem(CONFIG.STORAGE_KEYS.ADVISOR_MESSAGE);
      },

      removeAdvisorSuggestions() {
        sessionStorage.removeItem(CONFIG.STORAGE_KEYS.ADVISOR_SUGGESTIONS);
      },
    },

    async init() {
      const container = document.querySelector(".shopify-agent-container");
      if (!container) return;

      this.UI.init(container);

      // Check for existing conversation
      let agentUserId = this.Util.getAgentUserId();
      let agentSessionId = this.Util.getAgentSessionId();
      let advisorSessionId = this.Util.getAdvisorSessionId();
      let cartId = await this.API.fetchCartId();

      if (!cartId.includes("?key=")) {
        cartId = await this.API.updateCartId();
      }

      // Handle new user
      if (!agentUserId) {
        agentUserId = "user-" + crypto.randomUUID();
        this.Util.setAgentUserId(agentUserId);
      }

      // Handle new sessions for advisor
      if (!advisorSessionId) {
        advisorSessionId =
          await this.API.fetchLatestSessionForAdvisor(agentUserId);

        if (advisorSessionId) {
          this.Util.setAdvisorSessionId(advisorSessionId);
        } else {
          advisorSessionId =
            await this.API.createSessionForAdvisor(agentUserId);
          this.Util.setAdvisorSessionId(advisorSessionId);
        }
      }

      // Handle new sessions for agent
      if (!agentSessionId) {
        agentSessionId = await this.API.fetchLatestSessionForAgent(agentUserId);

        if (agentSessionId) {
          this.Util.setAgentSessionId(agentSessionId);
        } else {
          agentSessionId = await this.API.createSessionForAgent(
            agentUserId,
            cartId,
          );
          this.Util.setAgentSessionId(agentSessionId);

          this.UI.removeTypingIndicator();
          this.API.injectAgentMessage(agentSessionId, CONFIG.WELCOME_MESSAGE);

          this.Util.startAdvisor();
          return;
        }
      }

      this.UI.removeTypingIndicator();
      await this.API.fetchChatHistoryForAgent(agentSessionId);
      this.Util.startAdvisor();
    },
  };

  ShopifyAgent.init();
})();
