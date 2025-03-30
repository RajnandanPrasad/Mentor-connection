import { useState, useEffect } from "react";
import { useChat } from "../../context/ChatContext";
import { getMessages, sendMessage } from "../../services/chatService";
import socket from "../../socket/socket";

const ChatWindow = () => {
  const { selectedChat, messages, setMessages } = useChat();
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChat) return;

      const token = localStorage.getItem("token");
      try {
        const chatMessages = await getMessages(selectedChat._id, token);
        setMessages(chatMessages);
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    };

    fetchMessages();
  }, [selectedChat]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const token = localStorage.getItem("token");
    try {
      const message = await sendMessage(selectedChat._id, newMessage, token);
      setMessages([...messages, message]);
      socket.emit("sendMessage", message);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="w-3/4 flex flex-col">
      <div className="p-4 border-b">{selectedChat?.mentor.name || selectedChat?.mentee.name}</div>
      <div className="flex-1 p-4 overflow-auto">
        {messages.map((msg) => (
          <div key={msg._id} className="p-2 border rounded my-1">{msg.content}</div>
        ))}
      </div>
      <div className="p-4 border-t flex">
        <input
          type="text"
          className="flex-1 p-2 border rounded"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button onClick={handleSendMessage} className="ml-2 p-2 bg-blue-500 text-white rounded">Send</button>
      </div>
    </div>
  );
};

export default ChatWindow;
