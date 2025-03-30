import React from 'react';
import { Button } from './ui/button';
import { AlertCircle, RefreshCw, Video, MessageSquare, Wifi } from 'lucide-react';

/**
 * ConnectionErrorModal - A unified component for displaying connection errors
 * 
 * @param {Object} props
 * @param {string} props.type - The type of connection error ('video' or 'chat')
 * @param {string} props.errorMessage - The specific error message to display
 * @param {function} props.onRetry - Function to call when the retry button is clicked
 * @param {function} props.onClose - Function to call when the close button is clicked
 * @param {function} props.onAudioOnly - Function to call when the audio-only button is clicked (video only)
 */
const ConnectionErrorModal = ({ 
  type = 'video', 
  errorMessage = 'Connection error occurred', 
  onRetry, 
  onClose,
  onAudioOnly
}) => {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 text-red-600 mb-4">
          <AlertCircle className="h-8 w-8" />
          <h2 className="text-xl font-semibold">
            {type === 'video' ? 'Video Call Error' : 'Chat Connection Error'}
          </h2>
        </div>

        <p className="text-gray-700 mb-4">{errorMessage}</p>

        <div className="bg-gray-50 rounded-lg p-4 mb-5">
          <h3 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            Connection Troubleshooting
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="font-medium">1.</span> Check your internet connection
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium">2.</span> Try refreshing the page
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium">3.</span> Ensure you've allowed all necessary permissions
            </li>
            {type === 'video' && (
              <li className="flex items-start gap-2">
                <span className="font-medium">4.</span> Try connecting with audio only if video isn't working
              </li>
            )}
          </ul>
        </div>

        <div className="flex flex-wrap gap-3 justify-end">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1"
          >
            Close
          </Button>
          
          <Button 
            onClick={onRetry}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Connection
          </Button>
          
          {type === 'video' && onAudioOnly && (
            <Button 
              onClick={onAudioOnly}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Audio Only
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionErrorModal; 