import { createContext, useState, useContext, useEffect } from "react";
import { getChats } from "../services/chatService";
import socket from "../socket/socket";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null); // Store logged-in user info

  // Fetch chats on load
  useEffect(() => {
    const fetchChats = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const chatData = await getChats(token);
        setChats(chatData);
      } catch (error) {
        console.error("Error loading chats:", error);
      }
    };

    fetchChats();
  }, []);

  // Listen for new messages
  useEffect(() => {
    socket.on("newMessage", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.off("newMessage");
    };
  }, []);

  return (
    <ChatContext.Provider value={{ chats, selectedChat, setSelectedChat, messages, setMessages, user, setUser }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
