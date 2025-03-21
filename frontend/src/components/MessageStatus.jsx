import React from 'react';
import { FaCheck, FaCheckDouble } from 'react-icons/fa';

const MessageStatus = ({ message, currentUserId }) => {
  const isOwnMessage = message.sender._id === currentUserId;
  
  if (!isOwnMessage) return null;

  return (
    <span className="message-status">
      {message.readBy.length > 1 ? (
        <FaCheckDouble className="text-blue-500" />
      ) : message.delivered ? (
        <FaCheck className="text-gray-500" />
      ) : (
        <FaCheck className="text-gray-300" />
      )}
    </span>
  );
};

export default MessageStatus; 