// src/services/signaling.ts
import io from 'socket.io-client';
import { getCurrentUser } from './auth';
import { CONFIG } from '../config/config';

// Server URL
const SERVER_URL = CONFIG.SERVER.SIGNALING_URL;

// Create a global variable for the socket connection
declare global {
  var socketIO: any;
}

// Connect to the signaling server
export const connect = () => {
  try {
    console.log('🔌 Attempting to connect to signaling server:', SERVER_URL);
    
    global.socketIO = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });
    
    global.socketIO.on('connect', () => {
      console.log('✅ Connected to signaling server:', global.socketIO.id);
    });

    global.socketIO.on('connect_error', (error: Error) => {
      console.error('❌ Connection error:', error);
      console.error('Server URL:', SERVER_URL);
    });

    global.socketIO.on('error', (error: Error) => {
      console.error('❌ Socket error:', error);
    });

    global.socketIO.on('disconnect', (reason: string) => {
      console.log('🔌 Disconnected from signaling server. Reason:', reason);
    });

    global.socketIO.on('reconnect', (attemptNumber: number) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
    });

  } catch (error) {
    console.error('❌ Failed to connect to signaling server:', error);
  }
};

// Disconnect from the signaling server
export const disconnect = () => {
  if (global.socketIO) {
    global.socketIO.disconnect();
  }
};

// Join the queue to find a chat partner
export const joinQueue = async () => {
  try {
    const user = await getCurrentUser();
    if (user && global.socketIO) {
      global.socketIO.emit('join-queue', { userId: user.uid });
    }
  } catch (error) {
    console.error('Error joining queue:', error);
  }
};

// Leave the queue
export const leaveQueue = () => {
  if (global.socketIO) {
    global.socketIO.emit('leave-queue');
  }
};

// Send a signaling message to a specific peer
export const sendSignalingMessage = (type: string, data: any) => {
  if (global.socketIO) {
    global.socketIO.emit(type, data);
  } else {
    console.error('Socket not connected, cannot send message');
  }
};

// Skip to next partner
export const skipPartner = async () => {
  try {
    if (global.socketIO) {
      global.socketIO.emit('skip-partner');
    }
  } catch (error) {
    console.error('Error skipping partner:', error);
  }
};

// Test server connection
export const testServerConnection = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing server connection to:', SERVER_URL);
    const response = await fetch(`${SERVER_URL}/health`);
    const data = await response.json();
    console.log('✅ Server health check successful:', data);
    return data.status === 'OK';
  } catch (error) {
    console.error('❌ Server health check failed:', error);
    return false;
  }
};

// Get connection status
export const isConnected = (): boolean => {
  return global.socketIO && global.socketIO.connected;
};