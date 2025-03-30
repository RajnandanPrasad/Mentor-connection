import { useChat } from "../../context/ChatContext";

const ChatList = () => {
  const { chats, setSelectedChat } = useChat();

  return (
    <div className="w-1/4 p-4 bg-gray-100 border-r">
      <h2 className="text-xl font-bold mb-4">Chats</h2>
      {chats.length === 0 ? (
        <p>No chats available</p>
      ) : (
        chats.map((chat) => (
          <div
            key={chat._id}
            onClick={() => setSelectedChat(chat)}
            className="p-3 cursor-pointer hover:bg-gray-200 rounded-md"
          >
            {chat.mentor.name || chat.mentee.name}
          </div>
        ))
      )}
    </div>
  );
};

export default ChatList;
