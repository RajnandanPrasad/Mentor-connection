/**
 * Utility functions for testing socket and peer connections
 */

/**
 * Tests socket connectivity with an echo request
 * @param {Object} socket - Socket.io instance
 * @param {string} userId - User ID to include in test
 * @returns {Promise} - Resolves with response or rejects with error
 */
export const testSocketConnection = (socket, userId) => {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not initialized'));
      return;
    }
    
    // Create a unique test ID
    const testId = Date.now();
    
    // Set up a one-time listener for the echo response
    socket.once(`echo-response-${testId}`, (response) => {
      resolve({
        success: true,
        socketId: socket.id,
        response
      });
    });
    
    // Set timeout for response
    const timeout = setTimeout(() => {
      socket.off(`echo-response-${testId}`);
      reject(new Error('Socket echo test timed out after 5 seconds'));
    }, 5000);
    
    // Send the echo test
    socket.emit('echo-test', {
      testId,
      userId,
      timestamp: new Date().toISOString()
    });
  });
};

/**
 * Tests camera and microphone access
 * @returns {Promise} - Resolves with media stream or rejects with error
 */
export const testMediaAccess = async () => {
  try {
    // Check for MediaDevices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('MediaDevices API not supported in this browser');
    }
    
    // First check what devices are available
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasCamera = devices.some(device => device.kind === 'videoinput');
    const hasMicrophone = devices.some(device => device.kind === 'audioinput');
    
    // Request access based on available devices
    let stream;
    if (hasCamera && hasMicrophone) {
      // Try with both
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } else if (hasCamera) {
      // Only camera
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } else if (hasMicrophone) {
      // Only microphone
      stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    } else {
      throw new Error('No camera or microphone devices detected');
    }
    
    // Return success with stream and device info
    return {
      success: true,
      stream,
      hasCamera,
      hasMicrophone,
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length
    };
  } catch (error) {
    // Handle specific error types
    if (error.name === 'NotAllowedError') {
      throw new Error('Camera/microphone access denied by user or system');
    } else if (error.name === 'NotFoundError') {
      throw new Error('No camera or microphone found');
    } else if (error.name === 'NotReadableError') {
      throw new Error('Camera or microphone is already in use by another application');
    } else {
      throw error;
    }
  }
};

/**
 * Tests network quality
 * @returns {Promise} - Resolves with network metrics
 */
export const testNetworkQuality = async () => {
  try {
    // Test download speed with a small test file
    const startTime = Date.now();
    const response = await fetch('/connection-test.json');
    const data = await response.json();
    const endTime = Date.now();
    
    // Calculate latency
    const latency = endTime - startTime;
    
    return {
      success: true,
      latency,
      connectionType: navigator.connection ? navigator.connection.effectiveType : 'unknown'
    };
  } catch (error) {
    throw new Error(`Network test failed: ${error.message}`);
  }
};

/**
 * Creates and tests a simple RTCPeerConnection
 * @returns {Promise} - Resolves with connection result or rejects with error
 */
export const testPeerConnection = () => {
  return new Promise((resolve, reject) => {
    try {
      // Check if RTCPeerConnection is supported
      if (!window.RTCPeerConnection) {
        throw new Error('WebRTC not supported in this browser');
      }
      
      // Create two peer connections to test locally
      const pc1 = new RTCPeerConnection();
      const pc2 = new RTCPeerConnection();
      
      // Set up data channel for testing
      const channel = pc1.createDataChannel('test-channel');
      
      // Set up event listeners
      pc1.onicecandidate = (event) => {
        if (event.candidate) {
          pc2.addIceCandidate(event.candidate);
        }
      };
      
      pc2.onicecandidate = (event) => {
        if (event.candidate) {
          pc1.addIceCandidate(event.candidate);
        }
      };
      
      pc2.ondatachannel = (event) => {
        const receiveChannel = event.channel;
        receiveChannel.onopen = () => {
          resolve({
            success: true,
            message: 'WebRTC peer connection test successful'
          });
          
          // Clean up
          setTimeout(() => {
            channel.close();
            pc1.close();
            pc2.close();
          }, 500);
        };
      };
      
      // Create offer and set local description
      pc1.createOffer()
        .then(offer => pc1.setLocalDescription(offer))
        .then(() => pc2.setRemoteDescription(pc1.localDescription))
        .then(() => pc2.createAnswer())
        .then(answer => pc2.setLocalDescription(answer))
        .then(() => pc1.setRemoteDescription(pc2.localDescription))
        .catch(reject);
      
      // Set timeout in case connection fails
      setTimeout(() => {
        reject(new Error('WebRTC connection test timed out'));
        pc1.close();
        pc2.close();
      }, 10000);
    } catch (error) {
      reject(error);
    }
  });
};

export default {
  testSocketConnection,
  testMediaAccess,
  testNetworkQuality,
  testPeerConnection
}; 