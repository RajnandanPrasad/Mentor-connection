import React from 'react';
import { FaCheck, FaCheckDouble } from 'react-icons/fa';

const MessageStatus = ({ message, currentUserId }) => {
  const isOwnMessage = message.sender === currentUserId;
  
  if (!isOwnMessage) return null;

  const isRead = message.readBy && message.readBy.length > 0;
  
  return (
    <span className="ml-1">
      {isRead ? (
        <FaCheckDouble className="text-blue-300" />
      ) : (
        <FaCheck className="text-gray-400" />
      )}
    </span>
  );
};

export default MessageStatus; 