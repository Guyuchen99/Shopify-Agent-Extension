import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { GoogleAuth } from "google-auth-library";

dotenv.config();

async function getAccessToken() {
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  return token;
}

const app = express();

const PORT = process.env.PORT;
const PROJECT_ID = process.env.PROJECT_ID;
const LOCATION = process.env.LOCATION;
const RESOURCE_ID = process.env.RESOURCE_ID;

if (!PROJECT_ID || !LOCATION || !RESOURCE_ID) {
  console.error("Missing required environment variables. Check PROJECT_ID, LOCATION, and RESOURCE_ID.");
  process.exit(1);
}

const AGENT_ENGINE_BASE_URL = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/reasoningEngines/${RESOURCE_ID}`;

app.use(cors());
app.use(express.json());

app.post("/api/chat/send-message", async (req, res) => {
  try {
    const { message, userId, sessionId, cartId } = req.body;

    if (!message || !userId || !sessionId || !cartId) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const token = await getAccessToken();
    const requestUrl = `${AGENT_ENGINE_BASE_URL}:streamQuery`;
    const finalMessage = `cart_id=gid://shopify/Cart/${cartId}\nuser_message=${message}`;

    const payload = {
      class_method: "async_stream_query",
      input: {
        user_id: userId,
        session_id: sessionId,
        message: finalMessage,
      },
    };

    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    const results = [];

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n");

      while (boundary !== -1) {
        const chunk = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 1);

        if (chunk) {
          try {
            const parsedChunk = JSON.parse(chunk);
            results.push(parsedChunk);
          } catch (error) {
            console.error("Failed to parse chunk: ", chunk, error);
          }
        }
        boundary = buffer.indexOf("\n");
      }
    }

    res.status(200).json(results);
  } catch (error) {
    console.error("Something went wrong with /api/chat/send-message: ", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/chat/get-latest-session", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const token = await getAccessToken();
    const requestUrl = `${AGENT_ENGINE_BASE_URL}:query`;

    const payload = {
      class_method: "async_list_sessions",
      input: {
        user_id: userId,
      },
    };

    const response = await axios.post(requestUrl, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Something went wrong with /api/chat/get-latest-session: ", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/chat/get-history", async (req, res) => {
  try {
    const { userId, sessionId } = req.body;

    if (!userId || !sessionId) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const token = await getAccessToken();
    const requestUrl = `${AGENT_ENGINE_BASE_URL}:query`;

    const payload = {
      class_method: "async_get_session",
      input: {
        user_id: userId,
        session_id: sessionId,
      },
    };

    const response = await axios.post(requestUrl, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Something went wrong with /api/chat/get-history: ", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
