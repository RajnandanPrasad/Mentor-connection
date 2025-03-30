import ChatList from "../components/Chat/ChatList";
import ChatWindow from "../components/Chat/ChatWindow";

const ChatPage = () => (
  <div className="flex h-screen">
    <ChatList />
    <ChatWindow />
  </div>
);

export default ChatPage;
