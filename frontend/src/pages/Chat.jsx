import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { initSocket } from "../services/socket"; // Ensure socket setup exists
import { useAuth } from "../context/AuthContext"; // Ensure Auth Context is available

const Chat = () => {
  const { chatId } = useParams(); // Get chatId from URL
  const navigate = useNavigate();
  const { user } = useAuth(); // Get logged-in user details
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const token = sessionStorage.getItem("token");
        if (!token) return console.error("No token found");

        const res = await axios.get(`${apiUrl}/api/chat`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setChats(res.data);
      } catch (error) {
        console.error("Error fetching chats:", error);
      }
    };

    fetchChats();
  }, []);

  useEffect(() => {
    if (!chatId) return;

    const fetchMessages = async () => {
      try {
        const token = sessionStorage.getItem("token");
        if (!token) return console.error("No token found");

        const res = await axios.get(`${apiUrl}/api/chat/${chatId}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setMessages(res.data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
    checkUserConnection();
  }, [chatId]);

  useEffect(() => {
    // Initialize Socket.io
    const socketInstance = initSocket();
    setSocket(socketInstance);

    socketInstance.on("newMessage", (message) => {
      // ✅ Use "newMessage" (matches backend)
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const checkUserConnection = async () => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) return console.error("No token found");

      const res = await axios.get(`${apiUrl}/api/connections/check/${user._id}/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsConnected(res.data.isConnected);
    } catch (error) {
      console.error("Error checking connection:", error);
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === "") return;

    try {
      const token = sessionStorage.getItem("token");
      if (!token) return console.error("No token found");

      const res = await axios.post(
        `${apiUrl}/api/chat/${chatId}/messages`,
        { content: newMessage }, // Updated to match new API
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages([...messages, res.data]);
      setNewMessage("");

      // Emit message to Socket.io
      if (socket) {
        socket.emit("sendMessage", res.data);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar with Chats List */}
      <div className="w-1/3 bg-gray-200 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Chats</h2>
        {chats.map((chat) => (
          <div
            key={chat._id}
            className={`p-3 mb-2 rounded-lg cursor-pointer ${
              chatId === chat._id ? "bg-blue-500 text-white" : "bg-white"
            }`}
            onClick={() => navigate(`/chat/${chat._id}`)}
          >
            {chat.mentor?.name || "Mentor"} & {chat.mentee?.name || "Mentee"}
          </div>
        ))}
      </div>

      {/* Messages Panel */}
      <div className="w-2/3 p-4 flex flex-col">
        <div className="flex-1 overflow-y-auto border-b p-4">
          {messages.map((msg) => (
            <div
              key={msg._id}
              className={`p-2 rounded-lg mb-2 ${
                msg.sender?._id === user._id
                  ? "bg-blue-400 text-white self-end"
                  : "bg-gray-300 text-black self-start"
              }`}
            >
              {msg.content}
            </div>
          ))}
        </div>

        {/* Message Input */}
        {chatId && isConnected ? (
          <div className="flex mt-2">
            <input
              type="text"
              className="flex-1 p-2 border rounded-lg"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button
              className="ml-2 bg-blue-500 text-white p-2 rounded-lg"
              onClick={handleSendMessage}
            >
              Send
            </button>
          </div>
        ) : (
          <p className="text-red-500 text-center mt-4">
            You need to be connected to start a chat.
          </p>
        )}
      </div>
    </div>
  );
};

export default Chat;
