import axios from "axios";

// Use environment variable for API URL with fallback
const API_URL = import.meta.env.VITE_API_URL || "";
const CHAT_ENDPOINT = `${API_URL}/api/chat`;

// Get all chats for the current user (works for both mentors and mentees)
export const getChats = async (token) => {
  if (!token) {
    console.error("Authentication token missing");
    throw new Error("Authentication required");
  }
  
  try {
    console.log("Fetching chats from:", CHAT_ENDPOINT);
    const response = await axios.get(CHAT_ENDPOINT, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("Fetched chats:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching chats:", error.response?.data || error.message);
    throw error;
  }
};

// Get a specific chat by ID
export const getChat = async (chatId, token) => {
  if (!token || !chatId) {
    console.error("Missing required parameters");
    throw new Error("Missing required parameters");
  }
  
  try {
    console.log(`Fetching chat ${chatId} from: ${CHAT_ENDPOINT}/${chatId}`);
    const response = await axios.get(`${CHAT_ENDPOINT}/${chatId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching chat ${chatId}:`, error.response?.data || error.message);
    throw error;
  }
};

// Get messages for a specific chat
export const getMessages = async (chatId, token) => {
  if (!token || !chatId) {
    console.error("Missing required parameters");
    throw new Error("Missing required parameters");
  }
  
  try {
    console.log(`Fetching messages for chat ${chatId} from: ${CHAT_ENDPOINT}/${chatId}/messages`);
    const response = await axios.get(`${CHAT_ENDPOINT}/${chatId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching messages for chat ${chatId}:`, error.response?.data || error.message);
    throw error;
  }
};

// Send a message in a specific chat
export const sendMessage = async (chatId, content, token) => {
  if (!token || !chatId || !content) {
    console.error("Missing required parameters");
    throw new Error("Missing required parameters");
  }
  
  try {
    console.log(`Sending message to chat ${chatId}:`, content);
    const response = await axios.post(
      `${CHAT_ENDPOINT}/${chatId}/messages`,
      { content },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error sending message to chat ${chatId}:`, error.response?.data || error.message);
    throw error;
  }
};

// Initialize a new chat between a mentor and mentee
export const initializeChat = async (menteeId, token) => {
  if (!token || !menteeId) {
    console.error("Missing required parameters");
    throw new Error("Missing required parameters");
  }
  
  try {
    console.log(`Initializing chat with mentee ${menteeId}`);
    const response = await axios.post(
      `${CHAT_ENDPOINT}/initialize`,
      { menteeId },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error initializing chat with mentee ${menteeId}:`, error.response?.data || error.message);
    throw error;
  }
};

// Get chat by mentee ID (for mentors) or mentor ID (for mentees)
export const getChatByParticipant = async (participantId, userType, token) => {
  if (!token || !participantId || !userType) {
    console.error("Missing required parameters");
    throw new Error("Missing required parameters");
  }
  
  try {
    console.log(`Finding chat with ${userType} ${participantId}`);
    const url = `${CHAT_ENDPOINT}/participant/${participantId}?userType=${userType}`;
    console.log("Request URL:", url);
    
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching chat with participant ${participantId}:`, error.response?.data || error.message);
    
    // If error is 404, return null instead of throwing error
    if (error.response && error.response.status === 404) {
      return null;
    }
    
    throw error;
  }
};
