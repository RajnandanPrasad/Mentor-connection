import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { useSocket } from "../context/SocketContext";

const Chat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const { socket, on, off } = useSocket();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData) {
      navigate("/login");
      return;
    }
    setUser(userData);
    fetchChats();

    // Listen for new messages
    on('newDirectMessage', handleNewMessage);

    return () => {
      off('newDirectMessage', handleNewMessage);
    };
  }, [navigate]);

  const fetchChats = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log("Fetching chats with token:", token); // Debug log
      const response = await axios.get("http://localhost:5000/api/chats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Chats response:", response.data); // Debug log
      setChats(response.data);
      
      // If we have a chatPartner from navigation state, select that chat
      if (location.state?.chatPartner) {
        const partnerChat = response.data.find(chat => 
          chat.mentor._id === location.state.chatPartner.mentor._id &&
          chat.mentee._id === location.state.chatPartner.mentee._id
        );
        if (partnerChat) {
          setSelectedChat(partnerChat);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching chats:", error.response || error);
      setError("Failed to load chats. Please try again later.");
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const token = localStorage.getItem("token");
      console.log("Fetching messages for chat:", chatId); // Debug log
      const response = await axios.get(`http://localhost:5000/api/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Messages response:", response.data); // Debug log
      setMessages(response.data);
      scrollToBottom();
    } catch (error) {
      console.error("Error fetching messages:", error.response || error);
      setError("Failed to load messages. Please try again later.");
    }
  };

  const handleNewMessage = (data) => {
    console.log("Received new message:", data); // Debug log
    if (selectedChat && (
      data.senderId === selectedChat.mentor._id ||
      data.senderId === selectedChat.mentee._id
    )) {
      setMessages(prev => [...prev, {
        _id: Date.now(), // Temporary ID until refresh
        sender: { _id: data.senderId, name: data.senderName },
        content: data.message,
        createdAt: data.timestamp
      }]);
      scrollToBottom();
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const token = localStorage.getItem("token");
      console.log("Sending message to chat:", selectedChat._id); // Debug log
      const response = await axios.post(
        `http://localhost:5000/api/chats/${selectedChat._id}/messages`,
        { content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Message send response:", response.data); // Debug log

      // Add the new message to the list
      setMessages(prev => [...prev, response.data]);
      setNewMessage("");

      // Emit socket event
      const recipientId = user.role === 'mentor' 
        ? selectedChat.mentee._id 
        : selectedChat.mentor._id;
      
      socket?.emit('sendDirectMessage', {
        recipientId,
        message: newMessage
      });

      scrollToBottom();
    } catch (error) {
      console.error("Error sending message:", error.response || error);
      setError("Failed to send message. Please try again.");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat._id);
    }
  }, [selectedChat]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Chat List Sidebar */}
      <div className="w-1/4 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>
        <div className="overflow-y-auto h-full">
          {chats.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>No conversations yet.</p>
              {user?.role === "mentee" && (
                <p className="mt-2">
                  Find a mentor to start chatting!
                </p>
              )}
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat._id}
                onClick={() => setSelectedChat(chat)}
                className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                  selectedChat?._id === chat._id ? "bg-blue-50" : ""
                }`}
              >
                <div className="font-medium text-gray-800">
                  {user.role === "mentor"
                    ? chat.mentee.name
                    : chat.mentor.name}
                </div>
                <div className="text-sm text-gray-500">
                  {chat.lastMessage?.content || "No messages yet"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <h3 className="text-lg font-semibold text-gray-800">
                {user.role === "mentor"
                  ? selectedChat.mentee.name
                  : selectedChat.mentor.name}
              </h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`flex ${
                    message.sender._id === user._id ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.sender._id === user._id
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className="text-xs mt-1 opacity-75">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 bg-white">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-xl mb-2">Select a chat to start messaging</p>
              {chats.length === 0 && (
                <p className="text-sm">
                  {user?.role === "mentee"
                    ? "Find and connect with a mentor to start chatting!"
                    : "Accept mentorship requests to start chatting with mentees!"}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
  