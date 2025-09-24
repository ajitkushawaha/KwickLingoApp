const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
}));

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Store users in queue and active connections
const userQueue = [];
const activeConnections = new Map();
const userSocketMap = new Map(); // Map userId to socketId

// Live streaming data
const liveStreams = new Map(); // Map streamId to stream data
const streamViewers = new Map(); // Map streamId to array of viewers

// Handle socket connections
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining the queue
  socket.on('join-queue', (data) => {
    const { userId } = data;
    console.log(`User ${userId} joined queue`);

    // Map userId to socketId
    userSocketMap.set(userId, socket.id);

    // Add user to queue if not already there
    if (!userQueue.find(user => user.userId === userId)) {
      userQueue.push({
        userId,
        socketId: socket.id,
        joinedAt: Date.now(),
      });
    }

    // Try to match users
    matchUsers();
  });

  // Handle user leaving the queue
  socket.on('leave-queue', () => {
    console.log(`User ${socket.id} left queue`);
    removeUserFromQueue(socket.id);
  });

  // Handle WebRTC signaling
  socket.on('webrtc-offer', (data) => {
    const { targetId, sdp } = data;
    console.log(`WebRTC offer from ${socket.id} to ${targetId}`);

    // Find target user's socket
    const targetSocket = findSocketByUserId(targetId);
    if (targetSocket) {
      console.log(`✅ Found target socket for ${targetId}, sending offer`);
      // Find sender's userId
      let senderId = null;
      for (let [userId, socketId] of userSocketMap) {
        if (socketId === socket.id) {
          senderId = userId;
          break;
        }
      }
      targetSocket.emit('webrtc-offer', { sdp, senderId });
    } else {
      console.log(`❌ Could not find target socket for ${targetId}`);
      console.log('Available users:', Array.from(userSocketMap.keys()));
    }
  });

  socket.on('webrtc-answer', (data) => {
    const { targetId, sdp } = data;
    console.log(`WebRTC answer from ${socket.id} to ${targetId}`);

    const targetSocket = findSocketByUserId(targetId);
    if (targetSocket) {
      targetSocket.emit('webrtc-answer', { sdp });
    }
  });

  socket.on('webrtc-ice-candidate', (data) => {
    const { targetId, candidate } = data;
    console.log(`ICE candidate from ${socket.id} to ${targetId}`);

    const targetSocket = findSocketByUserId(targetId);
    if (targetSocket) {
      targetSocket.emit('webrtc-ice-candidate', { candidate });
    }
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    const { targetId, text } = data;
    console.log(`Chat message from ${socket.id} to ${targetId}: ${text}`);

    const targetSocket = findSocketByUserId(targetId);
    if (targetSocket) {
      targetSocket.emit('chat-message', {
        text,
        senderId: socket.id,
      });
    }
  });

  // Handle typing indicators
  socket.on('typing-start', (data) => {
    const { targetId } = data;
    console.log(`Typing start from ${socket.id} to ${targetId}`);

    const targetSocket = findSocketByUserId(targetId);
    if (targetSocket) {
      targetSocket.emit('typing-start');
    }
  });

  socket.on('typing-stop', (data) => {
    const { targetId } = data;
    console.log(`Typing stop from ${socket.id} to ${targetId}`);

    const targetSocket = findSocketByUserId(targetId);
    if (targetSocket) {
      targetSocket.emit('typing-stop');
    }
  });

  // Handle partner skipping
  socket.on('skip-partner', () => {
    console.log(`User ${socket.id} wants to skip partner`);
    // Remove current connection and find new partner
    removeActiveConnection(socket.id);
    matchUsers();
  });

  // ===== LIVE STREAMING EVENTS =====

  // Start live stream
  socket.on('start-live-stream', (data) => {
    const { streamId, title, description, streamerId } = data;
    console.log(`🎥 Stream started: ${streamId} by ${streamerId}`);

    liveStreams.set(streamId, {
      streamId,
      title,
      description,
      streamerId,
      socketId: socket.id,
      startTime: Date.now(),
      viewerCount: 0,
    });

    streamViewers.set(streamId, []);

    // Notify all clients about new live stream
    io.emit('live-stream-started', {
      streamId,
      title,
      description,
      streamerId,
    });
  });

  // End live stream
  socket.on('end-live-stream', (data) => {
    const { streamId, streamerId } = data;
    console.log(`🎥 Stream ended: ${streamId} by ${streamerId}`);

    // Notify all viewers that stream ended
    const viewers = streamViewers.get(streamId) || [];
    viewers.forEach(viewer => {
      const viewerSocket = io.sockets.sockets.get(viewer.socketId);
      if (viewerSocket) {
        viewerSocket.emit('stream-ended');
      }
    });

    // Clean up stream data
    liveStreams.delete(streamId);
    streamViewers.delete(streamId);

    // Notify all clients about stream ending
    io.emit('live-stream-ended', { streamId });
  });

  // Join stream as viewer
  socket.on('join-stream', (data) => {
    const { streamId, streamerId, viewerId, viewerName } = data;
    console.log(`👀 Viewer ${viewerId} joined stream ${streamId}`);

    const stream = liveStreams.get(streamId);
    if (!stream) {
      socket.emit('stream-not-found');
      return;
    }

    // Add viewer to stream
    const viewers = streamViewers.get(streamId) || [];
    const viewer = {
      id: viewerId,
      name: viewerName,
      socketId: socket.id,
      joinedAt: Date.now(),
    };

    viewers.push(viewer);
    streamViewers.set(streamId, viewers);

    // Update viewer count
    stream.viewerCount = viewers.length;
    liveStreams.set(streamId, stream);

    // Notify streamer about new viewer
    const streamerSocket = io.sockets.sockets.get(stream.socketId);
    if (streamerSocket) {
      streamerSocket.emit('viewer-joined', { viewer });
    }

    // Notify all viewers about updated count
    viewers.forEach(v => {
      const viewerSocket = io.sockets.sockets.get(v.socketId);
      if (viewerSocket) {
        viewerSocket.emit('viewer-count-update', { count: viewers.length });
      }
    });
  });

  // Leave stream
  socket.on('leave-stream', (data) => {
    const { streamId, viewerId } = data;
    console.log(`👀 Viewer ${viewerId} left stream ${streamId}`);

    const viewers = streamViewers.get(streamId) || [];
    const updatedViewers = viewers.filter(v => v.id !== viewerId);
    streamViewers.set(streamId, updatedViewers);

    // Update viewer count
    const stream = liveStreams.get(streamId);
    if (stream) {
      stream.viewerCount = updatedViewers.length;
      liveStreams.set(streamId, stream);

      // Notify streamer about viewer leaving
      const streamerSocket = io.sockets.sockets.get(stream.socketId);
      if (streamerSocket) {
        streamerSocket.emit('viewer-left', { viewerId });
      }

      // Notify remaining viewers about updated count
      updatedViewers.forEach(v => {
        const viewerSocket = io.sockets.sockets.get(v.socketId);
        if (viewerSocket) {
          viewerSocket.emit('viewer-count-update', { count: updatedViewers.length });
        }
      });
    }
  });

  // Send live message
  socket.on('live-message', (data) => {
    const { streamId, streamerId, message } = data;
    console.log(`💬 Live message in stream ${streamId}: ${message.text}`);

    const viewers = streamViewers.get(streamId) || [];
    const stream = liveStreams.get(streamId);

    if (stream) {
      // Send to streamer
      const streamerSocket = io.sockets.sockets.get(stream.socketId);
      if (streamerSocket) {
        streamerSocket.emit('live-message', message);
      }

      // Send to all viewers
      viewers.forEach(viewer => {
        const viewerSocket = io.sockets.sockets.get(viewer.socketId);
        if (viewerSocket) {
          viewerSocket.emit('live-message', message);
        }
      });
    }
  });

  // Send gift
  socket.on('send-gift', (data) => {
    const { streamId, streamerId, viewerId, giftType, giftValue } = data;
    console.log(`🎁 Gift sent in stream ${streamId}: ${giftType} ($${giftValue})`);

    const viewers = streamViewers.get(streamId) || [];
    const stream = liveStreams.get(streamId);

    if (stream) {
      // Find sender name
      const sender = viewers.find(v => v.id === viewerId);
      const senderName = sender ? sender.name : 'Anonymous';

      // Send to streamer
      const streamerSocket = io.sockets.sockets.get(stream.socketId);
      if (streamerSocket) {
        streamerSocket.emit('gift-received', {
          giftType,
          value: giftValue,
          senderName,
        });
      }

      // Send to all viewers
      viewers.forEach(viewer => {
        const viewerSocket = io.sockets.sockets.get(viewer.socketId);
        if (viewerSocket) {
          viewerSocket.emit('gift-received', {
            giftType,
            value: giftValue,
            senderName,
          });
        }
      });
    }
  });

  // Stream WebRTC events
  socket.on('stream-offer', (data) => {
    const { streamId, streamerId, viewerId, sdp } = data;
    console.log(`📡 Stream offer from ${streamerId} to viewer ${viewerId}`);

    const viewers = streamViewers.get(streamId) || [];
    const viewer = viewers.find(v => v.id === viewerId);

    if (viewer) {
      const viewerSocket = io.sockets.sockets.get(viewer.socketId);
      if (viewerSocket) {
        viewerSocket.emit('stream-offer', { sdp });
      }
    }
  });

  socket.on('stream-answer', (data) => {
    const { streamId, streamerId, viewerId, sdp } = data;
    console.log(`📡 Stream answer from viewer ${viewerId} to ${streamerId}`);

    const stream = liveStreams.get(streamId);
    if (stream) {
      const streamerSocket = io.sockets.sockets.get(stream.socketId);
      if (streamerSocket) {
        streamerSocket.emit('stream-answer', { sdp });
      }
    }
  });

  socket.on('stream-ice-candidate', (data) => {
    const { streamId, streamerId, viewerId, candidate } = data;
    console.log(`🧊 Stream ICE candidate from ${streamerId} to viewer ${viewerId}`);

    const viewers = streamViewers.get(streamId) || [];
    const viewer = viewers.find(v => v.id === viewerId);

    if (viewer) {
      const viewerSocket = io.sockets.sockets.get(viewer.socketId);
      if (viewerSocket) {
        viewerSocket.emit('stream-ice-candidate', { candidate });
      }
    }
  });

  socket.on('viewer-ice-candidate', (data) => {
    const { streamId, streamerId, viewerId, candidate } = data;
    console.log(`🧊 Viewer ICE candidate from ${viewerId} to ${streamerId}`);

    const stream = liveStreams.get(streamId);
    if (stream) {
      const streamerSocket = io.sockets.sockets.get(stream.socketId);
      if (streamerSocket) {
        streamerSocket.emit('viewer-ice-candidate', { candidate });
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    // Remove from user mapping
    for (let [userId, socketId] of userSocketMap) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }

    // Clean up live streaming data
    // Check if this socket was a streamer
    for (let [streamId, stream] of liveStreams) {
      if (stream.socketId === socket.id) {
        console.log(`🎥 Streamer disconnected, ending stream: ${streamId}`);

        // Notify all viewers that stream ended
        const viewers = streamViewers.get(streamId) || [];
        viewers.forEach(viewer => {
          const viewerSocket = io.sockets.sockets.get(viewer.socketId);
          if (viewerSocket) {
            viewerSocket.emit('stream-ended');
          }
        });

        // Clean up stream data
        liveStreams.delete(streamId);
        streamViewers.delete(streamId);

        // Notify all clients about stream ending
        io.emit('live-stream-ended', { streamId });
        break;
      }
    }

    // Check if this socket was a viewer
    for (let [streamId, viewers] of streamViewers) {
      const viewerIndex = viewers.findIndex(v => v.socketId === socket.id);
      if (viewerIndex !== -1) {
        const viewer = viewers[viewerIndex];
        console.log(`👀 Viewer disconnected from stream: ${streamId}`);

        // Remove viewer
        viewers.splice(viewerIndex, 1);
        streamViewers.set(streamId, viewers);

        // Update viewer count
        const stream = liveStreams.get(streamId);
        if (stream) {
          stream.viewerCount = viewers.length;
          liveStreams.set(streamId, stream);

          // Notify streamer about viewer leaving
          const streamerSocket = io.sockets.sockets.get(stream.socketId);
          if (streamerSocket) {
            streamerSocket.emit('viewer-left', { viewerId: viewer.id });
          }

          // Notify remaining viewers about updated count
          viewers.forEach(v => {
            const viewerSocket = io.sockets.sockets.get(v.socketId);
            if (viewerSocket) {
              viewerSocket.emit('viewer-count-update', { count: viewers.length });
            }
          });
        }
        break;
      }
    }

    // Remove from queue
    removeUserFromQueue(socket.id);

    // Remove from active connections
    removeActiveConnection(socket.id);

    // Notify partner if in active call
    notifyPartnerDisconnection(socket.id);
  });
});

// Function to match users in queue
function matchUsers() {
  if (userQueue.length >= 2) {
    // Take first two users from queue
    const user1 = userQueue.shift();
    const user2 = userQueue.shift();

    console.log(`Matching users: ${user1.userId} and ${user2.userId}`);

    // Find their sockets
    const socket1 = io.sockets.sockets.get(user1.socketId);
    const socket2 = io.sockets.sockets.get(user2.socketId);

    if (socket1 && socket2) {
      // Store active connection
      activeConnections.set(user1.socketId, user2.socketId);
      activeConnections.set(user2.socketId, user1.socketId);

      // Notify both users
      socket1.emit('partner-found', {
        partnerId: user2.userId,
        initiator: true,
      });

      socket2.emit('partner-found', {
        partnerId: user1.userId,
        initiator: false,
      });
    } else {
      // If sockets not found, put users back in queue
      userQueue.unshift(user1, user2);
    }
  } else {
    console.log(`Queue has ${userQueue.length} users, waiting for more...`);
  }
}

// Helper function to remove user from queue
function removeUserFromQueue(socketId) {
  const index = userQueue.findIndex(user => user.socketId === socketId);
  if (index !== -1) {
    userQueue.splice(index, 1);
  }
}

// Helper function to remove active connection
function removeActiveConnection(socketId) {
  const partnerSocketId = activeConnections.get(socketId);
  if (partnerSocketId) {
    activeConnections.delete(socketId);
    activeConnections.delete(partnerSocketId);
  }
}

// Helper function to find socket by user ID
function findSocketByUserId(userId) {
  const socketId = userSocketMap.get(userId);
  if (socketId) {
    return io.sockets.sockets.get(socketId);
  }
  return null;
}

// Helper function to notify partner of disconnection
function notifyPartnerDisconnection(socketId) {
  const partnerSocketId = activeConnections.get(socketId);
  if (partnerSocketId) {
    const partnerSocket = io.sockets.sockets.get(partnerSocketId);
    if (partnerSocket) {
      partnerSocket.emit('partner-disconnected');
    }
    removeActiveConnection(socketId);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    queueLength: userQueue.length,
    activeConnections: activeConnections.size / 2,
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all interfaces for Android emulator access
server.listen(PORT, HOST, () => {
  console.log(`🚀 KwickLingo Signaling Server running on ${HOST}:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 Android emulator: http://10.0.2.2:${PORT}/health`);
});
