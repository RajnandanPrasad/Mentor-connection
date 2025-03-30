import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'react-hot-toast';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { PhoneOff, Mic, MicOff, Video, VideoOff, RefreshCw } from 'lucide-react';
import TroubleshootingModal from './TroubleshootingModal';
import ConnectionErrorModal from './ConnectionErrorModal';

const VideoCall = ({ callId, recipientId, recipientName, onEndCall }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const { socket, isConnected: socketConnected, reconnect } = useSocket();
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus] = useState('initializing'); // initializing, calling, connected, ended
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const maxConnectionAttempts = 3;
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [troubleshootingIssue, setTroubleshootingIssue] = useState('');
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const [error, setError] = useState(null);
  const [showPermissionUI, setShowPermissionUI] = useState(false);
  const [pendingCandidates, setPendingCandidates] = useState([]);

  const MAX_RECONNECT_ATTEMPTS = 3;

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  // Function to set connection error and show troubleshooting
  const handleConnectionError = (errorMessage, issueType) => {
    setConnectionError(errorMessage);
    setTroubleshootingIssue(issueType);
    setShowTroubleshooting(true);
  };

  // Attempt connection function
  const attemptConnection = () => {
    console.log(`Connection attempt ${connectionAttempts + 1} of ${maxConnectionAttempts}`);
    
    // Close any existing peer connection first to avoid issues
      if (peerConnectionRef.current) {
      console.log("Closing existing peer connection before creating a new one");
      try {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      } catch (err) {
        console.error("Error closing existing peer connection:", err);
      }
    }
    
    if (socketConnected) {
      console.log("Socket is connected, initializing peer connection");
      
      // Set a timeout for connection establishment
      const connectionTimeout = setTimeout(() => {
        if (callStatus !== 'connected') {
          console.error("Connection timed out");
          handleConnectionError(
            "Call connection timed out. The other participant may not be available.",
            'call_failed'
          );
        }
      }, 30000); // 30 second timeout
      
      // Initialize the connection
      initializePeerConnection().then(pc => {
        if (pc) {
          setupSocketListeners();
          return true;
        } else {
          return false;
        }
      }).catch(err => {
        console.error("Failed to initialize peer connection:", err);
        return false;
      }).finally(() => {
        clearTimeout(connectionTimeout);
      });
      
      return true;
    } else if (connectionAttempts < maxConnectionAttempts - 1) {
      // Try to reconnect if we have a reconnect function
      if (reconnect) {
        console.log("Attempting to reconnect socket...");
        reconnect();
      }
      
      setConnectionAttempts(prev => prev + 1);
      
      // Schedule another attempt after 1 second
      setTimeout(attemptConnection, 1000);
      return false;
    } else {
      // Max attempts reached
      console.error("Failed to connect after multiple attempts");
      handleConnectionError(
        "Unable to establish connection. Please check your internet connection.",
        'socket_disconnected'
      );
      return false;
    }
  };

  useEffect(() => {
    console.log("VideoCall component mounted with callId:", callId);
    console.log("Socket connected:", socketConnected);

    // Set a short delay to allow the component to render fully before requesting permissions
    setTimeout(() => {
      setShowPermissionUI(true);
      
      // Check socket connection and try to establish it
      const connectionTest = () => {
        console.log("Testing socket connection for video call");
        if (!socket) {
          console.error("Socket not initialized yet");
          return false;
        }
        
        // Test the socket with echo test
        if (socketConnected) {
          // Socket is connected, proceed with call setup
          console.log("Socket is connected, initializing call");
          return true;
        } else {
          console.warn("Socket not connected, will attempt connection");
          return false;
        }
      };
      
      // Try connecting with a small delay to ensure socket is ready
      setTimeout(() => {
        if (connectionTest()) {
          // Socket is connected, we can initialize the call
          attemptConnection();
        } else {
          // Socket is not connected, try to reconnect
          if (reconnect) {
            console.log("Attempting to reconnect socket for video call");
            reconnect();
            
            // Set a timeout to check if reconnection succeeded
            setTimeout(() => {
              if (socketConnected) {
                attemptConnection();
              } else {
                handleConnectionError(
                  "Unable to establish connection to the server. Please check your internet connection and try again.",
                  'socket_disconnected'
                );
              }
            }, 3000); // Wait 3 seconds for reconnection attempt
          } else {
            handleConnectionError(
              "Unable to connect to the server. Please refresh the page and try again.",
              'socket_disconnected'
            );
          }
        }
      }, 1000);
    }, 500); // Short delay to allow UI rendering

    return () => {
      cleanupVideoCall();
    };
  }, [callId, recipientId]);

  // Reset connection attempts when connection status changes
  useEffect(() => {
    if (socketConnected && connectionAttempts > 0) {
      console.log("Socket reconnected successfully");
      initializePeerConnection();
      setupSocketListeners();
      setConnectionError(null);
    }
  }, [socketConnected]);

  const setupSocketListeners = () => {
    if (!socket) return;

    console.log("Setting up socket listeners for video call", callId);

    // Remove any existing listeners to prevent duplicates
    socket.off('video-offer');
    socket.off('video-answer'); 
    socket.off('ice-candidate');
    socket.off('call-ended');
    socket.off('video-offer-error');
    socket.off('connection-confirmed');

    // Join the call room with a more robust approach
    if (callId) {
      console.log('Joining call room:', callId);
      
      // Send a more structured join request with all necessary information
      const joinData = {
        callId, 
        userId: user._id,
        recipientId: recipientId,
        timestamp: new Date().toISOString()
      };
      socket.emit('join-call', joinData);
      
      // Also join a user-specific room to ensure calls reach the right person
      socket.emit('join', { 
        userId: user._id, 
        roomType: 'call',
        callId: callId 
      });
      
      // Log confirmation of room joining
      socket.once('room-joined', (data) => {
        console.log('Successfully joined room:', data.room);
        
        // After joining room, check if we need to initiate the call
        // This helps with synchronization issues where events are missed
        setTimeout(() => {
          if (callStatus === 'initializing' || callStatus === 'calling') {
            console.log('Initiating call after room join');
            initiateCall();
          }
        }, 1000);
      });
    }

    // Add a new handler for connection confirmation
    socket.on('connection-confirmed', (data) => {
      console.log('Connection confirmed:', data);
      if (data.callId === callId) {
        setCallStatus('connected');
        setIsConnecting(false);
        
        // Process any pending ICE candidates now that connection is established
        if (pendingCandidates.length > 0 && peerConnectionRef.current) {
          console.log(`Processing ${pendingCandidates.length} pending ICE candidates`);
          pendingCandidates.forEach(candidate => {
            try {
              peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
                .catch(e => console.error("Error adding pending ICE candidate:", e));
            } catch (err) {
              console.error("Error processing pending ICE candidate:", err);
            }
          });
          setPendingCandidates([]);
        }
      }
    });

    socket.on('video-offer', async (data) => {
      console.log('Received video offer:', data);
      if (data.callId === callId) {
        try {
          // If we don't have a peer connection, create one
          if (!peerConnectionRef.current) {
            console.log('Creating peer connection to handle offer');
            await initializePeerConnection();
          }
          
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
          
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          
          console.log('Sending video answer to:', data.callerId);
          socket.emit('video-answer', {
            callId,
            recipientId: data.callerId,
            answer,
            senderId: user._id
          });
          
          // Instead of immediately setting connected, wait for ICE connection
          setCallStatus('connecting');
          
          // Send confirmation back to caller
          socket.emit('connection-confirmed', {
            callId,
            recipientId: data.callerId,
            senderId: user._id
          });
        } catch (error) {
          console.error('Error handling video offer:', error);
          setConnectionError('Failed to process video offer: ' + error.message);
          
          // Send error back to caller
          socket.emit('video-offer-error', {
            callId,
            recipientId: data.callerId,
            error: error.message,
            senderId: user._id
          });
          
          // Attempt recovery
          attemptRecovery();
        }
      }
    });

    socket.on('video-answer', async (data) => {
      console.log('Received video answer:', data);
      if (data.callId === callId) {
        try {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            console.log('Set remote description from answer successfully');
            
            // Instead of immediately setting connected, wait for ICE connection
            setCallStatus('connecting');
            
            // Send confirmation to callee
            socket.emit('connection-confirmed', {
              callId,
              recipientId: data.senderId,
              senderId: user._id
            });
          } else {
            throw new Error('Peer connection not initialized when answer received');
          }
        } catch (error) {
          console.error('Error handling video answer:', error);
          setConnectionError('Failed to process video answer: ' + error.message);
          
          // Attempt recovery
          attemptRecovery();
        }
      }
    });

    socket.on('ice-candidate', (data) => {
      console.log('Received ICE candidate:', data);
      if (data.callId === callId) {
        try {
          const candidate = data.candidate;
          
          // If the peer connection isn't ready yet, store the candidate for later
          if (!peerConnectionRef.current || 
              peerConnectionRef.current.signalingState === 'closed' || 
              peerConnectionRef.current.connectionState === 'closed') {
            console.log('Storing ICE candidate for later processing');
            setPendingCandidates(prev => [...prev, candidate]);
            return;
          }
          
          // Otherwise add it now
          peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
            .then(() => console.log('Added ICE candidate successfully'))
            .catch(err => {
              console.error('Error adding ICE candidate:', err);
              
              // If we get an invalid state error, store for later instead
              if (err.name === 'InvalidStateError') {
                console.log('Got invalid state error, storing candidate for later');
                setPendingCandidates(prev => [...prev, candidate]);
              }
            });
        } catch (error) {
          console.error('Error processing ICE candidate:', error);
        }
      }
    });

    socket.on('call-ended', (data) => {
      console.log('Call ended event received:', data);
      if (data.callId === callId) {
        toast.info(`Call ended by ${data.userId === user._id ? 'you' : recipientName}`);
        cleanupVideoCall(false); // Don't notify as we already got the event
        if (onEndCall) onEndCall();
      }
    });

    socket.on('video-offer-error', (data) => {
      console.log('Video offer error received:', data);
      if (data.callId === callId) {
        setConnectionError(`Call failed: ${data.error || 'Unknown error'}`);
        setIsConnecting(false);
        setCallStatus('failed');
      }
    });
  };

  // Helper function to attempt recovery from connection errors
  const attemptRecovery = () => {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      setReconnectAttempts(prev => prev + 1);
      console.log(`Attempting recovery (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
      
      // Close existing peer connection
      if (peerConnectionRef.current) {
        try {
          peerConnectionRef.current.close();
        } catch (err) {
          console.error("Error closing peer connection during recovery:", err);
        }
        peerConnectionRef.current = null;
      }
      
      // Try creating a new connection after a delay
      setTimeout(() => {
        initializePeerConnection().then(() => {
          if (callStatus === 'calling') {
            initiateCall();
          }
        });
      }, 2000);
    } else {
      console.error("Max recovery attempts reached");
      setConnectionError("Failed to establish a stable connection after multiple attempts.");
      setCallStatus('failed');
    }
  };

  // Modify the checkDeviceAvailability function to not check permissions yet
  const checkDeviceAvailability = async () => {
    try {
      // Check if the browser supports the required APIs
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.error("Browser doesn't support media device enumeration");
        return { videoAvailable: false, audioAvailable: false };
      }
      
      // Try to enumerate devices without checking permissions yet
      // Note: This might return empty if permissions haven't been granted yet
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // Check if camera and microphone devices exist
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      console.log(`Found ${videoDevices.length} video devices and ${audioDevices.length} audio devices`);
      
      // If no devices are found, that could either mean:
      // 1. The user truly has no devices, or
      // 2. The browser hasn't been granted permissions yet
      
      // Instead of making conclusions, we'll return true for both in case
      // permissions haven't been granted yet, and let getUserMedia handle it
      return {
        // Return true for both if either we detected devices or we have no label info yet
        // (no label info could mean permissions haven't been granted yet)
        videoAvailable: videoDevices.length > 0 || devices.some(d => !d.label),
        audioAvailable: audioDevices.length > 0 || devices.some(d => !d.label)
      };
    } catch (error) {
      console.error("Error checking device availability:", error);
      // Assume devices are available if we can't check
      return { videoAvailable: true, audioAvailable: true };
    }
  };
  
  // Fix the initializePeerConnection function to properly handle permissions
  const initializePeerConnection = async (audioOnly = false) => {
    try {
      console.log("Initializing peer connection...");
      setCallStatus('initializing');
      setIsRequestingPermissions(true);
      setError(null); // Clear any previous errors
      
      // First check if we're connected to the server
      if (!socket || !socketConnected) {
        throw new Error("Not connected to the server. Please check your internet connection and try again.");
      }
      
      // Get device availability (but don't trust it 100% for permissions yet)
      const { videoAvailable, audioAvailable } = await checkDeviceAvailability();
      console.log(`Initial device check: video=${videoAvailable}, audio=${audioAvailable}`);
      
      // Set up media constraints based on what we think is available and audioOnly flag
      let mediaConstraints = {};
      
      if (audioOnly) {
        console.log("Audio-only mode requested");
        mediaConstraints = { audio: true, video: false };
        setIsVideoOff(true);
      } else {
        // Default - try to get both audio and video
        mediaConstraints = { 
          audio: true, 
          video: true
        };
      }
      
      console.log("Requesting media with constraints:", mediaConstraints);
      toast.loading('Requesting media access...', { id: 'media-access' });
      
      // Here's the key change: We'll try to get the media stream directly
      // without checking permissions first, which will trigger the browser's
      // permission prompt if needed
      try {
        const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        console.log("Media access granted:", stream);
        toast.success('Media access granted', { id: 'media-access' });
        
        // Set the stream in state and ref
        setLocalStream(stream);
        localStreamRef.current = stream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // Update UI based on what tracks we actually got
        const hasVideoTrack = stream.getVideoTracks().length > 0;
        const hasAudioTrack = stream.getAudioTracks().length > 0;
        
        if (!hasVideoTrack) {
          setIsVideoOff(true);
        }
        
        if (!hasAudioTrack) {
          setIsMuted(true);
        }
      } catch (mediaError) {
        console.error("Media access error:", mediaError);
        toast.error('Media access failed', { id: 'media-access' });
        
        // If video failed but we haven't tried audio-only yet, try that instead
        if (!audioOnly && mediaError.name !== 'NotAllowedError') {
          console.log("Video access failed, falling back to audio-only");
          toast.loading('Trying audio-only...', { id: 'media-access' });
          return initializePeerConnection(true); // Retry with audio only
        }
        
        // Handle specific error cases with user-friendly messages
        if (mediaError.name === 'NotAllowedError') {
          throw new Error(
            "Camera/microphone access was denied. Please check your browser settings and ensure you've granted permission."
          );
        } else if (mediaError.name === 'NotFoundError') {
          throw new Error(
            "No camera or microphone found. Please make sure your devices are properly connected."
          );
        } else if (mediaError.name === 'NotReadableError' || mediaError.name === 'TrackStartError') {
          throw new Error(
            "Your camera or microphone is already in use by another application. Please close other applications that might be using your devices."
          );
        } else {
          throw mediaError;
        }
      }
      
      setIsRequestingPermissions(false);
      
      // Create and configure RTCPeerConnection
      console.log("Creating new RTCPeerConnection with config:", configuration);
      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;
      
      // Add event handlers
      pc.onicecandidate = handleIceCandidate;
      pc.ontrack = handleTrackEvent;
      pc.oniceconnectionstatechange = handleIceConnectionStateChange;
      
      // Add local tracks to the peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          console.log(`Adding ${track.kind} track to peer connection`);
          pc.addTrack(track, localStreamRef.current);
        });
      }
      
      // Create offer if this is the caller side
      if (user && user._id !== recipientId) {
        try {
          console.log("Creating offer as caller");
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: !audioOnly
          });
          
          await pc.setLocalDescription(offer);
          console.log("Local description set, sending offer");
          
          // Send the offer to the recipient
          socket.emit('video-offer', {
            callId,
            callerId: user._id,
            callerName: user.name,
            recipientId,
            recipientName,
            offer: pc.localDescription
          });
          
          setCallStatus('calling');
        } catch (offerError) {
          console.error("Error creating offer:", offerError);
          throw new Error("Failed to create call offer. Please try again.");
        }
      }
      
      return pc;
    } catch (error) {
      console.error("Failed to initialize peer connection:", error);
      setError(error.message || "Failed to set up video call");
      setIsRequestingPermissions(false);
      setCallStatus('error');
      return null;
    }
  };

  // Add separate handler functions for peer connection events
  const handleIceCandidate = (event) => {
    if (event.candidate) {
      console.log("Sending ICE candidate");
      socket.emit('ice-candidate', {
        callId,
        recipientId,
        candidate: event.candidate
      });
    }
  };

  const handleTrackEvent = (event) => {
    console.log("Remote track received:", event);
    setRemoteStream(event.streams[0]);
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = event.streams[0];
    }
    
    setCallStatus('connected');
    setIsConnected(true);
  };

  const handleIceConnectionStateChange = (event) => {
    console.log("ICE connection state changed:", peerConnectionRef.current?.iceConnectionState);
    
    if (peerConnectionRef.current?.iceConnectionState === 'failed') {
      console.error("ICE connection failed");
      handleConnectionFailure();
    } else if (peerConnectionRef.current?.iceConnectionState === 'disconnected') {
      console.warn("ICE connection disconnected, attempting to reconnect");
      // Try to restart ICE if disconnected
      if (peerConnectionRef.current.restartIce) {
        peerConnectionRef.current.restartIce();
      }
    }
  };

  const handleConnectionFailure = () => {
    console.error("Video call connection failed");
    handleConnectionError(
      "Failed to establish video call connection. The other party may have connection issues.",
      'call_failed'
    );
    cleanupVideoCall();
  };

  const cleanupVideoCall = (notifyOther = true) => {
    console.log('Cleaning up video call...');
    
    // Stop all tracks in local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
      localStreamRef.current = null;
    }
    
    // Also check the state variable just in case
    if (localStream) {
      localStream.getTracks().forEach(track => {
        console.log('Stopping track from state:', track.kind);
        track.stop();
      });
      setLocalStream(null);
    }
    
    // Also stop remote tracks if they exist
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => {
        console.log('Stopping remote track:', track.kind);
        track.stop();
      });
      setRemoteStream(null);
    }
    
    // Clean up video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Reset all states
    setIsMuted(false);
    setIsVideoOff(false);
    setIsConnecting(false);
    setCallStatus('ended');
    
    // Notify the other user if specified
    if (notifyOther && socket && socketConnected && callId) {
      console.log('Sending leave-call event for:', callId);
      socket.emit('leave-call', { 
        callId,
        recipientId 
      });
      
      // Also leave the call room
      socket.emit('leave', { roomId: `call_${callId}` });
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !audioTracks[0].enabled;
        setIsMuted(!audioTracks[0].enabled);
        toast.success(audioTracks[0].enabled ? 'Unmuted' : 'Muted');
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !videoTracks[0].enabled;
        setIsVideoOff(!videoTracks[0].enabled);
        toast.success(videoTracks[0].enabled ? 'Video turned on' : 'Video turned off');
      }
    }
  };

  const endCall = () => {
    toast.success('Ending call...');
    cleanupVideoCall();
    if (onEndCall) onEndCall();
  };

  // Add a connection health check function
  useEffect(() => {
    if (callStatus === 'connected' && peerConnectionRef.current) {
      const connectionHealthCheck = setInterval(() => {
        checkConnectionHealth();
      }, 5000); // Check every 5 seconds
      
      return () => {
        clearInterval(connectionHealthCheck);
      };
    }
  }, [callStatus]);

  // Connection health check function
  const checkConnectionHealth = () => {
    // Skip if we don't have a connection yet
    if (!peerConnectionRef.current) return;
    
    const pc = peerConnectionRef.current;
    const connectionState = pc.connectionState || 'unknown';
    const iceConnectionState = pc.iceConnectionState || 'unknown';
    
    console.log(`Connection health check: connectionState=${connectionState}, iceConnectionState=${iceConnectionState}`);
    
    // Check connection states
    if (['disconnected', 'failed', 'closed'].includes(connectionState) || 
        ['disconnected', 'failed', 'closed'].includes(iceConnectionState)) {
      
      console.warn(`Unhealthy connection detected: ${connectionState}/${iceConnectionState}`);
      
      // If reconnect attempts have been exceeded
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error(`Maximum reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Ending call.`);
        setError("Call connection lost and couldn't be re-established");
        return;
      }
      
      // If we're in a disconnected state, attempt to restart ICE
      if (iceConnectionState === 'disconnected' && pc.restartIce) {
        console.log("Attempting to restart ICE connection");
        setReconnectAttempts(prev => prev + 1);
        pc.restartIce();
        
        // If we have createOffer, try to renegotiate
        if (pc.signalingState === 'stable' && user._id !== recipientId) {
          pc.createOffer({ iceRestart: true })
            .then(offer => pc.setLocalDescription(offer))
            .then(() => {
              // Send the updated offer to restart connection
              socket.emit('video-offer', {
                callId,
                callerId: user._id,
                callerName: user.name || 'User',
                recipientId,
                recipientName,
                offer: pc.localDescription,
                restart: true
              });
              console.log("Sent restart offer");
            })
            .catch(err => {
              console.error("Error creating restart offer:", err);
            });
        }
      }
      
      // If the connection is completely failed, try to re-initialize
      if (iceConnectionState === 'failed' || connectionState === 'failed') {
        console.log("Connection failed, attempting to recover");
        // If we've exceeded the first few attempts, show a message to the user
        if (reconnectAttempts > 1) {
          setError("Connection issues detected. Attempting to recover...");
        }
        
        // After a certain number of attempts, try completely reinitializing
        if (reconnectAttempts > 2) {
          console.log("Multiple reconnect attempts failed, trying full reinitialization");
          // Close the current connection
          if (pc) {
            pc.close();
            peerConnectionRef.current = null;
          }
          
          // Try to initialize a new connection
          setTimeout(() => {
            initializePeerConnection()
              .then(() => {
                setError(null);
              })
              .catch(err => {
                console.error("Failed to reinitialize connection:", err);
              });
          }, 1000);
        }
      }
    } else if (connectionState === 'connected' && iceConnectionState === 'connected') {
      // Connection is healthy, clear any transient errors
      if (error && error.includes("Connection issues detected")) {
        setError(null);
      }
      
      // Reset reconnect attempts if connection has been stable
      if (reconnectAttempts > 0) {
        setReconnectAttempts(0);
      }
    }
  };

  if (connectionError) {
    return (
      <Card className="fixed inset-4 md:inset-8 lg:inset-16 z-50 p-6 text-center shadow-2xl flex flex-col">
        <div className="text-2xl font-bold mb-4 text-red-600">Video Call Error</div>
        <div className="text-red-600 text-lg mb-4 font-medium">{connectionError}</div>
        
        <div className="bg-red-50 rounded-lg p-6 mb-4 text-left border border-red-100">
          <h3 className="font-semibold mb-3 text-lg">Troubleshooting Steps:</h3>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>Check your internet connection</li>
            <li>Make sure your camera and microphone are properly connected</li>
            
            <li className="font-medium">Camera/Microphone Permissions:</li>
            <div className="ml-5 mt-1 space-y-2 text-sm">
              <div className="p-3 bg-white rounded border border-gray-200">
                <p className="font-medium mb-1">Chrome / Edge</p>
                <ol className="list-decimal ml-5 text-xs space-y-1">
                  <li>Look for the <span className="inline-block w-4 h-4 bg-gray-200 rounded-full text-center text-xs">🔒</span> or <span className="inline-block w-4 h-4 bg-gray-200 rounded-full text-center text-xs">i</span> icon in your address bar</li>
                  <li>Click on it, then select "Site settings"</li>
                  <li>Find "Camera" and "Microphone" and set both to "Allow"</li>
                  <li>Refresh the page and try again</li>
                </ol>
              </div>
              
              <div className="p-3 bg-white rounded border border-gray-200">
                <p className="font-medium mb-1">Firefox</p>
                <ol className="list-decimal ml-5 text-xs space-y-1">
                  <li>Look for the camera icon in the address bar</li>
                  <li>Click on it and select "Allow" for camera and microphone</li>
                  <li>If no icon appears, go to Firefox menu → Preferences → Privacy & Security → Site Permissions</li>
                  <li>Refresh the page and try again</li>
                </ol>
              </div>
              
              <div className="p-3 bg-white rounded border border-gray-200">
                <p className="font-medium mb-1">Safari</p>
                <ol className="list-decimal ml-5 text-xs space-y-1">
                  <li>Go to Safari menu → Preferences → Websites → Camera/Microphone</li>
                  <li>Find this website in the list and select "Allow"</li>
                  <li>Refresh the page and try again</li>
                </ol>
              </div>
            </div>
            
            <li>Close other applications that might be using your camera or microphone</li>
            <li>Restart your browser if the problem persists</li>
          </ul>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-auto">
          <Button 
            onClick={() => {
              setConnectionError(null);
              setReconnectAttempts(0);
              setConnectionAttempts(0);
              initializePeerConnection();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Retry with Video
          </Button>
          
          <Button 
            onClick={() => {
              setConnectionError(null);
              setReconnectAttempts(0);
              setConnectionAttempts(0);
              // Try audio-only mode
              setIsVideoOff(true);
              // Add a small delay to ensure state is updated
              setTimeout(async () => {
                try {
                  // Request only audio
                  const audioStream = await navigator.mediaDevices.getUserMedia({ 
                    audio: true,
                    video: false
                  });
                  setLocalStream(audioStream);
                  localStreamRef.current = audioStream;
                  
                  if (localVideoRef.current) {
                    localVideoRef.current.srcObject = audioStream;
                  }
                  
                  // Continue with connection
                  setupSocketListeners();
                } catch (err) {
                  handleConnectionError(
                    "Could not access microphone. Please check permissions.",
                    'media_access'
                  );
                }
              }, 500);
            }}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Retry Audio Only
          </Button>
          
          <Button 
            onClick={endCall}
            variant="destructive"
            className="bg-red-500 hover:bg-red-600"
          >
            <PhoneOff className="h-5 w-5 mr-2" />
            End Call
          </Button>
        </div>
        
        <TroubleshootingModal 
          isOpen={showTroubleshooting}
          onClose={() => setShowTroubleshooting(false)}
          connectionIssue={troubleshootingIssue}
        />
      </Card>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col overflow-hidden">
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">
            Video Call with {recipientName || 'User'}
            {isRequestingPermissions ? ' (Setting up camera...)' : 
             isConnecting ? ' (Connecting...)' : ''}
          </h2>
          <Button
            onClick={endCall}
            variant="ghost"
            className="text-white hover:bg-blue-700 p-2 h-auto"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col md:flex-row p-6 gap-4 bg-gray-100">
          <div className="relative rounded-lg aspect-video bg-gray-900 flex-1 overflow-hidden">
            {/* Remote Video (Bigger) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
              {recipientName || 'Remote User'}
            </div>
            
            {isConnecting && !isConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/70">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-white mb-4"></div>
                <p className="text-lg">Connecting to {recipientName}...</p>
                <p className="text-sm mt-2 text-gray-300">Please wait while we establish a secure connection</p>
              </div>
            )}
          </div>
          
          <div className="relative md:w-1/3 aspect-video bg-gray-900 rounded-lg overflow-hidden">
            {/* Local Video (Smaller) */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
              className="w-full h-full object-cover"
          />
            <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
              You {isVideoOff ? "(Video Off)" : ""}
          </div>
            
            {isRequestingPermissions && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/70">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white mb-3"></div>
                <p>Accessing camera...</p>
        </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-white flex justify-center gap-6">
        <Button
          onClick={toggleMute}
            variant={isMuted ? "outline" : "default"}
            className={`rounded-full w-14 h-14 p-0 ${isMuted ? "bg-red-100 border-red-300 text-red-500" : "bg-blue-600 text-white"}`}
        >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>
        <Button
          onClick={toggleVideo}
            variant={isVideoOff ? "outline" : "default"}
            className={`rounded-full w-14 h-14 p-0 ${isVideoOff ? "bg-red-100 border-red-300 text-red-500" : "bg-blue-600 text-white"}`}
        >
            {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
        </Button>
        <Button
          onClick={endCall}
          variant="destructive"
            className="rounded-full w-14 h-14 p-0 bg-red-500 hover:bg-red-600"
        >
            <PhoneOff className="h-6 w-6" />
        </Button>
        </div>
      </div>
      
      {/* Only show troubleshooting modal when there's an actual error */}
      {connectionError && (
        <TroubleshootingModal 
          isOpen={showTroubleshooting}
          onClose={() => setShowTroubleshooting(false)}
          connectionIssue={troubleshootingIssue}
        />
      )}

      {error && (
        <ConnectionErrorModal
          type="video"
          errorMessage={error}
          onRetry={() => {
            setError(null);
            initializePeerConnection();
          }}
          onClose={() => {
            endCall();
          }}
          onAudioOnly={() => {
            setError(null);
            initializePeerConnection(true); // Pass true to request audio only
          }}
        />
      )}

      {showPermissionUI && isRequestingPermissions && !error && (
        <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="mb-4 text-center">
              <h2 className="text-xl font-semibold mb-2">Camera & Microphone Access</h2>
              <p className="text-gray-600">
                To join the video call, please allow access to your camera and microphone when prompted by your browser.
              </p>
            </div>
            
            <div className="flex justify-center mb-6">
              <div className="animate-pulse bg-blue-100 rounded-full p-6">
                <Video className="h-12 w-12 text-blue-600" />
              </div>
            </div>
            
            <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-800 mb-2">Where to look for the permission dialog:</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="bg-blue-100 p-1 rounded">
                    <span className="text-xs font-medium">Chrome/Edge</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Look for a camera icon in the address bar at the top. Click it and select "Allow".
                  </p>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="bg-orange-100 p-1 rounded">
                    <span className="text-xs font-medium">Firefox</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    A popup should appear at the top of the browser. Click "Allow".
                  </p>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="bg-gray-100 p-1 rounded">
                    <span className="text-xs font-medium">Safari</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    A permission dialog should appear. Click "Allow" to grant access.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  // Skip video and try audio only
                  initializePeerConnection(true);
                }}
                className="flex-1"
              >
                Audio Only
              </Button>
              
              <Button
                onClick={() => {
                  // Try to request permissions again
                  initializePeerConnection();
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Request Access
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCall; 