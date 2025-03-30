import React, { useState } from 'react';
import { Button } from './ui/button';
import { 
  testSocketConnection, 
  testMediaAccess, 
  testPeerConnection 
} from '../services/connectionTest';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { AlertCircle, Check, Loader2, Wifi } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './ui/dialog';

/**
 * ConnectionTestButton - A component that allows users to test their connection 
 * before starting a chat or video call
 */
const ConnectionTestButton = ({ testVideo = true, onComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState({
    socket: null,
    media: null,
    peer: null
  });
  const { socket, isConnected, reconnect } = useSocket();
  const { user } = useAuth();
  
  const runTests = async () => {
    if (!socket || !user) {
      toast.error('Cannot run test: Socket or user not initialized');
      return;
    }
    
    setIsLoading(true);
    setResults({
      socket: null,
      media: null,
      peer: null
    });
    
    // 1. Test socket connection
    try {
      const socketResult = await testSocketConnection(socket, user._id);
      setResults(prev => ({ ...prev, socket: { success: true, ...socketResult } }));
    } catch (error) {
      console.error('Socket test failed:', error);
      setResults(prev => ({ ...prev, socket: { success: false, error: error.message } }));
      
      // Try to reconnect the socket
      if (reconnect) {
        toast.loading('Attempting to reconnect socket...');
        reconnect();
      }
    }
    
    // Only run media tests if testVideo is true
    if (testVideo) {
      // 2. Test media access
      try {
        const mediaResult = await testMediaAccess();
        setResults(prev => ({ ...prev, media: { success: true, ...mediaResult } }));
        
        // Stop tracks to release camera/mic
        if (mediaResult.stream) {
          mediaResult.stream.getTracks().forEach(track => track.stop());
        }
      } catch (error) {
        console.error('Media test failed:', error);
        setResults(prev => ({ ...prev, media: { success: false, error: error.message } }));
      }
      
      // 3. Test WebRTC peer connection
      try {
        const peerResult = await testPeerConnection();
        setResults(prev => ({ ...prev, peer: { success: true, ...peerResult } }));
      } catch (error) {
        console.error('Peer connection test failed:', error);
        setResults(prev => ({ ...prev, peer: { success: false, error: error.message } }));
      }
    }
    
    setIsLoading(false);
  };
  
  const allTestsPassed = () => {
    if (!testVideo) {
      return results.socket && results.socket.success;
    }
    
    return (
      results.socket && results.socket.success &&
      results.media && results.media.success &&
      results.peer && results.peer.success
    );
  };
  
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <Wifi className="h-4 w-4" />
        Test Connection
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connection Test</DialogTitle>
            <DialogDescription>
              Test your connection before starting a {testVideo ? 'video call' : 'chat'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            {/* Results or Test Button */}
            {!isLoading && !results.socket ? (
              <Button 
                onClick={runTests} 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Run Connection Tests
              </Button>
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center p-4">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                <p>Running connection tests...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Socket Test Result */}
                <div className={`p-3 rounded-lg ${
                  results.socket?.success ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="flex items-center mb-1">
                    {results.socket?.success ? (
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    )}
                    <h3 className="font-medium">Socket Connection</h3>
                  </div>
                  <p className="text-sm">
                    {results.socket?.success
                      ? `Connected to server with socket ID: ${socket.id}`
                      : `Connection error: ${results.socket?.error}`
                    }
                  </p>
                </div>
                
                {/* Media Test Result (if applicable) */}
                {testVideo && (
                  <div className={`p-3 rounded-lg ${
                    results.media?.success ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <div className="flex items-center mb-1">
                      {results.media?.success ? (
                        <Check className="h-5 w-5 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                      )}
                      <h3 className="font-medium">Camera & Microphone</h3>
                    </div>
                    {results.media?.success ? (
                      <div className="text-sm">
                        <p>Camera: {results.media.hasCamera ? 'Available' : 'Not available'}</p>
                        <p>Microphone: {results.media.hasMicrophone ? 'Available' : 'Not available'}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-red-600">{results.media?.error}</p>
                    )}
                  </div>
                )}
                
                {/* Peer Connection Test Result (if applicable) */}
                {testVideo && (
                  <div className={`p-3 rounded-lg ${
                    results.peer?.success ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <div className="flex items-center mb-1">
                      {results.peer?.success ? (
                        <Check className="h-5 w-5 text-green-500 mr-2" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                      )}
                      <h3 className="font-medium">WebRTC</h3>
                    </div>
                    <p className="text-sm">
                      {results.peer?.success
                        ? 'WebRTC is working correctly'
                        : `WebRTC error: ${results.peer?.error}`
                      }
                    </p>
                  </div>
                )}
                
                {/* Overall Status */}
                <div className={`p-3 rounded-lg font-medium ${
                  allTestsPassed() ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {allTestsPassed()
                    ? 'All tests passed! You can proceed with the call.'
                    : 'Some tests failed. You may experience issues with your connection.'
                  }
                </div>
                
                {/* Run Again Button */}
                <Button 
                  onClick={runTests} 
                  className="w-full"
                  variant="outline"
                >
                  Run Tests Again
                </Button>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              disabled={isLoading || (!allTestsPassed() && !results.socket?.success)} 
              onClick={() => {
                setIsOpen(false);
                if (onComplete) onComplete(results);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {allTestsPassed() ? 'Proceed' : 'Proceed Anyway'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ConnectionTestButton; 