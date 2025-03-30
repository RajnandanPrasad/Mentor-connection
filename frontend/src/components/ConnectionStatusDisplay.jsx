import React, { useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext';
import { Button } from './ui/button';
import { Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react';

/**
 * A component that displays the current socket connection status and allows manual reconnection
 * This is primarily for development and testing purposes
 */
const ConnectionStatusDisplay = ({ showDetails = false }) => {
  const { isConnected, connectionStatus, connectionError, reconnectAttempts, reconnect } = useContext(SocketContext);

  const statusColor = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500',
    disconnected: 'bg-gray-500',
    error: 'bg-red-500',
    failed: 'bg-red-700'
  };

  const statusText = {
    connected: 'Connected',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
    error: 'Connection Error',
    failed: 'Connection Failed'
  };

  const statusIcon = {
    connected: <Wifi className="h-4 w-4" />,
    connecting: <Loader2 className="h-4 w-4 animate-spin" />,
    disconnected: <WifiOff className="h-4 w-4" />,
    error: <AlertCircle className="h-4 w-4" />,
    failed: <AlertCircle className="h-4 w-4" />
  };

  // Minimal display for production
  if (!showDetails) {
    return (
      <div className="flex items-center gap-2">
        <div className={`rounded-full h-2 w-2 ${statusColor[connectionStatus]}`}></div>
        <span className="text-xs text-gray-500">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    );
  }

  // Detailed display for development/testing
  return (
    <div className="border rounded-lg p-4 shadow-sm bg-white">
      <div className="flex items-center gap-2 mb-2">
        <div className={`rounded-full h-3 w-3 ${statusColor[connectionStatus]}`}></div>
        <div className="flex items-center gap-1 font-medium">
          {statusIcon[connectionStatus]}
          <span>{statusText[connectionStatus]}</span>
        </div>
      </div>
      
      {connectionStatus === 'connecting' && (
        <div className="text-sm text-gray-500 mb-2">
          Reconnect attempt: {reconnectAttempts}
        </div>
      )}
      
      {connectionError && (
        <div className="text-sm text-red-500 mb-2">
          {connectionError}
        </div>
      )}
      
      <div className="flex gap-2 mt-2">
        <Button 
          onClick={reconnect} 
          className="text-xs py-1 h-8"
          disabled={connectionStatus === 'connected' || connectionStatus === 'connecting'}
        >
          <Loader2 className={`h-3 w-3 mr-1 ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
          Reconnect
        </Button>
      </div>
    </div>
  );
};

export default ConnectionStatusDisplay; 