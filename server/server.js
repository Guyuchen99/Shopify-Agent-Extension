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

const AGENT_ENGINE_BASE_URL = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/reasoningEngines/${RESOURCE_ID}`;

app.use(cors());
app.use(express.json());

app.post("/api/chat/send-message", async (req, res) => {
  try {
    const REQUEST_URL = `${AGENT_ENGINE_BASE_URL}:streamQuery`;

    const { message, user_id, session_id } = req.body;

    const token = await getAccessToken();

    const payload = {
      class_method: "async_stream_query",
      input: {
        user_id: user_id,
        session_id: session_id,
        message: message,
      },
    };

    const response = await axios.post(REQUEST_URL, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Something went wrong with /api/chat/send-message: ", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/chat/get-latest-session", async (req, res) => {
  try {
    const REQUEST_URL = `${AGENT_ENGINE_BASE_URL}:query`;

    const { user_id } = req.body;

    const token = await getAccessToken();

    const payload = {
      class_method: "async_list_sessions",
      input: {
        user_id: user_id,
      },
    };

    const response = await axios.post(REQUEST_URL, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Something went wrong with /api/chat/get-latest-session: ", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/chat/get-history", async (req, res) => {
  try {
    const REQUEST_URL = `${AGENT_ENGINE_BASE_URL}:query`;

    const { user_id, session_id } = req.body;

    const token = await getAccessToken();

    const payload = {
      class_method: "async_get_session",
      input: {
        user_id: user_id,
        session_id: session_id,
      },
    };

    const response = await axios.post(REQUEST_URL, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Something went wrong with /api/chat/get-history: ", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
