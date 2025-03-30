import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Get chat by participant ID (mentor or mentee)
 * @param {string} participantId - ID of the mentor or mentee
 * @param {string} participantRole - "mentor" or "mentee"
 * @param {string} token - User's auth token
 */
export const getChatWithParticipant = async (participantId, participantRole, token) => {
  console.log(`Finding chat with ${participantRole} ${participantId}`);
  
  if (!token || !participantId || !participantRole) {
    console.error('Missing required parameters');
    throw new Error('Missing required parameters');
  }

  try {
    const url = `${API_URL}/api/chat/participant/${participantId}?userType=${participantRole}`;
    console.log('Request URL:', url);
    
    const response = await axios.get(url, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Chat response data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching chat:', error.response?.data || error.message);
    
    // If 404, return null instead of throwing
    if (error.response && error.response.status === 404) {
      return null;
    }
    
    throw error;
  }
};

/**
 * Initialize a new chat as a mentor
 * @param {string} menteeId - ID of the mentee
 * @param {string} token - Mentor's auth token
 */
export const initializeChat = async (menteeId, token) => {
  console.log(`Initializing new chat with mentee ${menteeId}`);
  
  if (!token || !menteeId) {
    console.error('Missing required parameters');
    throw new Error('Missing required parameters');
  }

  try {
    const response = await axios.post(
      `${API_URL}/api/chat/initialize`,
      { menteeId },
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Chat initialized:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error initializing chat:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get messages for a specific chat
 * @param {string} chatId - ID of the chat
 * @param {string} token - User's auth token
 */
export const getMessagesForChat = async (chatId, token) => {
  console.log(`Fetching messages for chat ${chatId}`);
  
  if (!token || !chatId) {
    console.error('Missing required parameters');
    throw new Error('Missing required parameters');
  }

  try {
    const response = await axios.get(
      `${API_URL}/api/chat/${chatId}/messages`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`Fetched ${response.data.length} messages`);
    return response.data;
  } catch (error) {
    console.error('Error fetching messages:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Send a message in a chat
 * @param {string} chatId - ID of the chat
 * @param {string} content - Message content
 * @param {string} token - User's auth token
 */
export const sendMessageToChat = async (chatId, content, token) => {
  console.log(`Sending message to chat ${chatId}`);
  
  if (!token || !chatId || !content) {
    console.error('Missing required parameters');
    throw new Error('Missing required parameters');
  }

  try {
    const response = await axios.post(
      `${API_URL}/api/chat/${chatId}/messages`,
      { content },
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Message sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Mark all messages in a chat as read
 * @param {string} chatId - ID of the chat
 * @param {string} token - User's auth token
 */
export const markMessagesAsRead = async (chatId, token) => {
  console.log(`Marking messages as read in chat ${chatId}`);
  
  if (!token || !chatId) {
    console.error('Missing required parameters');
    throw new Error('Missing required parameters');
  }

  try {
    const response = await axios.post(
      `${API_URL}/api/chat/${chatId}/read`,
      {},
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Messages marked as read:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error marking messages as read:', error.response?.data || error.message);
    throw error;
  }
}; 