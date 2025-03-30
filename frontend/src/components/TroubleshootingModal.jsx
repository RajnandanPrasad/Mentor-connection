import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { Button } from './ui/button';
import { AlertTriangle, Check, RefreshCw, Wifi, WifiOff } from 'lucide-react';

const TroubleshootingModal = ({ isOpen, onClose, connectionIssue }) => {
  const getIssueTitle = () => {
    switch (connectionIssue) {
      case 'socket_disconnected':
        return 'Connection Lost';
      case 'media_access':
        return 'Camera/Microphone Access Issue';
      case 'call_failed':
        return 'Call Connection Failed';
      case 'reconnecting':
        return 'Reconnecting to Server';
      default:
        return 'Connection Troubleshooting';
    }
  };

  const getIssueIcon = () => {
    switch (connectionIssue) {
      case 'socket_disconnected':
        return <WifiOff className="w-10 h-10 text-red-500 mb-2" />;
      case 'media_access':
        return <AlertTriangle className="w-10 h-10 text-amber-500 mb-2" />;
      case 'call_failed':
        return <AlertTriangle className="w-10 h-10 text-red-500 mb-2" />;
      case 'reconnecting':
        return <RefreshCw className="w-10 h-10 text-blue-500 mb-2 animate-spin" />;
      default:
        return <Wifi className="w-10 h-10 text-blue-500 mb-2" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex flex-col items-center justify-center">
            {getIssueIcon()}
            <DialogTitle className="text-xl">{getIssueTitle()}</DialogTitle>
          </div>
          <DialogDescription className="text-center">
            Let's resolve your connection issue
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-medium text-gray-900 mb-2">Common Solutions</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>Check your internet connection</li>
              <li>Try refreshing the page</li>
              <li>Clear your browser cache and cookies</li>
              <li>Try using a different browser</li>
              <li>Disable VPN or proxy if you're using one</li>
            </ul>
          </div>

          {connectionIssue === 'media_access' && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <h3 className="font-medium text-blue-900 mb-2">Camera/Microphone Access</h3>
              <div className="space-y-3">
                <p className="text-sm text-blue-800 mb-2">Your browser is blocking access to your camera or microphone. Follow these steps to enable access:</p>
                
                <div className="p-3 bg-white rounded border border-blue-100">
                  <p className="font-medium mb-1 text-sm">Chrome / Edge</p>
                  <ol className="list-decimal ml-5 text-xs space-y-1 text-blue-900">
                    <li>Look for the camera icon or lock icon (<span>🔒</span>) in the address bar</li>
                    <li>Click on it and select "Site settings"</li>
                    <li>Find "Camera" and "Microphone" and change both to "Allow"</li>
                    <li>Return to the page and click "Retry Connection"</li>
                  </ol>
                </div>
                
                <div className="p-3 bg-white rounded border border-blue-100">
                  <p className="font-medium mb-1 text-sm">Firefox</p>
                  <ol className="list-decimal ml-5 text-xs space-y-1 text-blue-900">
                    <li>Look for the camera icon in the address bar</li>
                    <li>Click it and select "Allow" for both camera and microphone</li>
                    <li>If you don't see the icon, go to: Menu → Preferences → Privacy & Security → Permissions</li>
                    <li>Find Camera and Microphone settings and remove this site from the blocked list</li>
                  </ol>
                </div>
                
                <div className="p-3 bg-white rounded border border-blue-100">
                  <p className="font-medium mb-1 text-sm">Safari</p>
                  <ol className="list-decimal ml-5 text-xs space-y-1 text-blue-900">
                    <li>Go to Safari → Preferences → Websites</li>
                    <li>Select Camera and then Microphone in the left sidebar</li>
                    <li>Find this website in the list and change the setting to "Allow"</li>
                    <li>Reload the page</li>
                  </ol>
                </div>
                
                <div className="p-3 bg-white rounded border border-blue-100">
                  <p className="font-medium mb-1 text-sm">If your camera is in use by another app:</p>
                  <ol className="list-decimal ml-5 text-xs space-y-1 text-blue-900">
                    <li>Close other video applications (Zoom, Teams, Skype, etc.)</li>
                    <li>Check if your camera is being used by other browser tabs</li>
                    <li>Try restarting your browser</li>
                    <li>As a last resort, restart your computer</li>
                  </ol>
                </div>
                
                <p className="text-sm text-blue-800 mt-2">
                  <strong>Tip:</strong> You can try the "Retry Audio Only" option if your camera isn't working
                </p>
              </div>
            </div>
          )}

          {connectionIssue === 'socket_disconnected' && (
            <div className="border rounded-lg p-4 bg-amber-50">
              <h3 className="font-medium text-amber-900 mb-2">Server Connection</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li>Check if your internet connection is stable</li>
                <li>Our system will try to reconnect automatically</li>
                <li>If the issue persists, try refreshing the page</li>
                <li>Check if there are any server maintenance notices</li>
              </ul>
            </div>
          )}

          {connectionIssue === 'call_failed' && (
            <div className="border rounded-lg p-4 bg-red-50">
              <h3 className="font-medium text-red-900 mb-2">Video Call Issues</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li>Ensure both parties have a stable internet connection</li>
                <li>Check if your browser supports WebRTC (Chrome, Firefox, Edge recommended)</li>
                <li>Try disabling any browser extensions that might interfere</li>
                <li>If on a corporate network, check if WebRTC is blocked</li>
              </ul>
            </div>
          )}

          <div className="border rounded-lg p-4 bg-green-50">
            <h3 className="font-medium text-green-900 mb-2">Still Having Issues?</h3>
            <p className="text-sm">
              If none of these solutions work, please contact our support team at support@mentorconnect.com
              or try again later.
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh Page
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TroubleshootingModal; 