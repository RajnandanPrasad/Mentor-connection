import React from 'react';
import { format } from 'date-fns';
import { CheckCheck } from 'lucide-react';
import { Avatar } from '../ui/avatar';

export const Message = ({ 
  message, 
  isOwn = false, 
  isFirst = false, 
  showAvatar = true,
  isRead = false,
  isDelivered = false,
  partnerName = '',
  partnerImage = ''
}) => {
  // Format timestamp to readable time
  const formatTime = (timestamp) => {
    try {
      return format(new Date(timestamp), 'h:mm a');
    } catch (err) {
      return format(new Date(), 'h:mm a');
    }
  };
  
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
      {!isOwn && showAvatar && (
        <div className="flex-shrink-0 mr-2">
          <Avatar 
            src={partnerImage}
            name={partnerName}
            alt={partnerName}
            size="sm"
            className="flex-shrink-0"
          />
        </div>
      )}
      
      <div className={`
        max-w-[80%] 
        ${isOwn 
          ? 'bg-primary-600 text-white rounded-tl-lg rounded-tr-sm rounded-bl-lg rounded-br-lg' 
          : 'bg-neutral-100 text-neutral-800 rounded-tl-sm rounded-tr-lg rounded-bl-lg rounded-br-lg'
        }
        py-2 px-3 
        ${isFirst && !isOwn ? 'mt-4' : ''}
      `}>
        <div className="text-sm">
          {message.text}
        </div>
        <div className="flex items-center justify-end mt-1 space-x-1">
          <span className={`text-xs ${isOwn ? 'text-primary-100' : 'text-neutral-500'}`}>
            {formatTime(message.timestamp)}
          </span>
          
          {isOwn && (
            <div className="flex items-center">
              {isRead && <CheckCheck className="h-3 w-3 text-primary-200" />}
              {isDelivered && !isRead && <CheckCheck className="h-3 w-3 text-primary-300/50" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 