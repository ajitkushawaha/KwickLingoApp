// src/screens/ViewerScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  FlatList,
  Alert,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigation';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
} from 'react-native-webrtc';
import { connect, disconnect, sendSignalingMessage } from '../service/signaling';
import { getCurrentUser } from '../service/auth';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

type ViewerScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Viewer'>;

interface ViewerScreenProps {
  navigation: ViewerScreenNavigationProp;
  route: {
    params: {
      streamId: string;
      streamerId: string;
      streamTitle: string;
    };
  };
}

interface LiveMessage {
  id: string;
  text: string;
  sender: 'viewer' | 'streamer';
  senderName: string;
  timestamp: number;
  isGift?: boolean;
  giftType?: string;
  giftValue?: number;
}

interface Gift {
  id: string;
  name: string;
  emoji: string;
  value: number;
  color: string;
}

const ViewerScreen: React.FC<ViewerScreenProps> = ({ navigation, route }) => {
  const { streamId, streamerId, streamTitle } = route.params;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [showChat, setShowChat] = useState<boolean>(true);
  const [showGiftPanel, setShowGiftPanel] = useState<boolean>(false);
  const [messageText, setMessageText] = useState<string>('');
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const userId = useRef<string | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const chatListRef = useRef<FlatList>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const giftAnim = useRef(new Animated.Value(0)).current;

  // Available gifts
  const gifts: Gift[] = [
    { id: 'heart', name: 'Heart', emoji: '❤️', value: 1, color: '#ff4444' },
    { id: 'rose', name: 'Rose', emoji: '🌹', value: 5, color: '#ff69b4' },
    { id: 'diamond', name: 'Diamond', emoji: '💎', value: 10, color: '#00c2ff' },
    { id: 'crown', name: 'Crown', emoji: '👑', value: 25, color: '#ffd700' },
    { id: 'star', name: 'Star', emoji: '⭐', value: 50, color: '#ffff00' },
    { id: 'rainbow', name: 'Rainbow', emoji: '🌈', value: 100, color: '#ff6b6b' },
  ];

  // Initialize viewer
  useEffect(() => {
    const initializeViewer = async () => {
      try {
        console.log('👀 Initializing Viewer...');

        // Get current user
        const user = await getCurrentUser();
        if (!user) {
          Alert.alert('Error', 'Please login to watch streams');
          navigation.goBack();
          return;
        }
        userId.current = user.uid;

        // Connect to signaling server
        await connect();

        // Join stream as viewer
        sendSignalingMessage('join-stream', {
          streamId,
          streamerId,
          viewerId: userId.current,
          viewerName: user.displayName || 'Anonymous',
        });

        // Setup viewer events
        setupViewerEvents();

        // Create peer connection for receiving stream
        await createPeerConnection();

        setIsLoading(false);

        // Start animations
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();

      } catch (error) {
        console.error('❌ Failed to initialize viewer:', error);
        Alert.alert('Connection Error', 'Failed to connect to stream. Please try again.');
        setIsLoading(false);
      }
    };

    initializeViewer();

    return () => {
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      disconnect();
    };
  }, []);

  // Setup viewer events
  const setupViewerEvents = () => {
    // Stream offer received
    global.socketIO.on('stream-offer', async (data: { sdp: any }) => {
      console.log('📡 Received stream offer');
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.sdp));

        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);

        sendSignalingMessage('stream-answer', {
          streamId,
          streamerId,
          viewerId: userId.current,
          sdp: peerConnection.current.localDescription,
        });
      }
    });

    // ICE candidate received
    global.socketIO.on('stream-ice-candidate', async (data: { candidate: any }) => {
      console.log('🧊 Received ICE candidate');
      if (peerConnection.current) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    // Viewer count updated
    global.socketIO.on('viewer-count-update', (data: { count: number }) => {
      setViewerCount(data.count);
    });

    // Live message received
    global.socketIO.on('live-message', (data: LiveMessage) => {
      setMessages(prev => [...prev, data]);

      // Scroll to bottom
      setTimeout(() => {
        if (chatListRef.current) {
          chatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    });

    // Gift received
    global.socketIO.on('gift-received', (data: { giftType: string; value: number; senderName: string }) => {
      const giftMessage: LiveMessage = {
        id: `gift_${Date.now()}`,
        text: `${data.senderName} sent a ${data.giftType}!`,
        sender: 'viewer',
        senderName: data.senderName,
        timestamp: Date.now(),
        isGift: true,
        giftType: data.giftType,
        giftValue: data.value,
      };

      setMessages(prev => [...prev, giftMessage]);

      // Animate gift
      Animated.sequence([
        Animated.timing(giftAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(giftAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Stream ended
    global.socketIO.on('stream-ended', () => {
      Alert.alert('Stream Ended', 'The streamer has ended the live stream.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    });
  };

  // Create peer connection
  const createPeerConnection = async () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    };

    peerConnection.current = new RTCPeerConnection(configuration);

    // Handle incoming stream
    peerConnection.current.ontrack = (event) => {
      console.log('📺 Received remote stream');
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        setIsConnected(true);
      }
    };

    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignalingMessage('viewer-ice-candidate', {
          streamId,
          streamerId,
          viewerId: userId.current,
          candidate: event.candidate,
        });
      }
    };
  };

  // Send message
  const sendMessage = () => {
    if (messageText.trim() === '') {return;}

    const message: LiveMessage = {
      id: `msg_${Date.now()}`,
      text: messageText.trim(),
      sender: 'viewer',
      senderName: 'You',
      timestamp: Date.now(),
    };

    sendSignalingMessage('live-message', {
      streamId,
      streamerId,
      message,
    });

    setMessageText('');
  };

  // Send gift
  const sendGift = (gift: Gift) => {
    Alert.alert(
      'Send Gift',
      `Send ${gift.emoji} ${gift.name} for $${gift.value}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            sendSignalingMessage('send-gift', {
              streamId,
              streamerId,
              viewerId: userId.current,
              giftType: gift.name,
              giftValue: gift.value,
            });
            setShowGiftPanel(false);
          },
        },
      ]
    );
  };

  // Toggle follow
  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
    // TODO: Implement follow functionality
  };

  // Format time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Loading screen
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00c2ff" />
        <Text style={styles.loadingText}>Connecting to stream...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Stream Video */}
      <View style={styles.streamContainer}>
        {remoteStream ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.streamVideo}
            objectFit="cover"
          />
        ) : (
          <View style={styles.noStreamContainer}>
            <ActivityIndicator size="large" color="#00c2ff" />
            <Text style={styles.noStreamText}>Connecting to stream...</Text>
          </View>
        )}

        {/* Stream Overlay */}
        <Animated.View
          style={[
            styles.streamOverlay,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Top Controls */}
          <View style={styles.topControls}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.streamInfo}>
              <Text style={styles.streamTitle}>{streamTitle}</Text>
              <View style={styles.viewerCount}>
                <Ionicons name="eye" size={16} color="#fff" />
                <Text style={styles.viewerCountText}>{viewerCount}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.followButton}
              onPress={toggleFollow}
            >
              <Ionicons
                name={isFollowing ? 'heart' : 'heart-outline'}
                size={20}
                color={isFollowing ? '#ff4444' : '#fff'}
              />
            </TouchableOpacity>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            <TouchableOpacity
              style={styles.giftButton}
              onPress={() => setShowGiftPanel(!showGiftPanel)}
            >
              <Ionicons name="gift" size={20} color="#fff" />
              <Text style={styles.giftButtonText}>Gifts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.chatToggle}
              onPress={() => setShowChat(!showChat)}
            >
              <Ionicons name={showChat ? 'chatbubbles' : 'chatbubbles-outline'} size={20} color="#fff" />
              <Text style={styles.chatToggleText}>Chat</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Gift Animation */}
        <Animated.View
          style={[
            styles.giftAnimation,
            {
              opacity: giftAnim,
              transform: [{ scale: giftAnim }],
            },
          ]}
        >
          <Text style={styles.giftText}>🎁 Gift Sent!</Text>
        </Animated.View>
      </View>

      {/* Gift Panel */}
      {showGiftPanel && (
        <Animated.View
          style={[
            styles.giftPanel,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.giftPanelHeader}>
            <Text style={styles.giftPanelTitle}>Send Gifts</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowGiftPanel(false)}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.giftsGrid}>
            {gifts.map((gift) => (
              <TouchableOpacity
                key={gift.id}
                style={[styles.giftItem, { borderColor: gift.color }]}
                onPress={() => sendGift(gift)}
              >
                <Text style={styles.giftEmoji}>{gift.emoji}</Text>
                <Text style={styles.giftName}>{gift.name}</Text>
                <Text style={[styles.giftValue, { color: gift.color }]}>${gift.value}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Live Chat */}
      {showChat && (
        <Animated.View
          style={[
            styles.chatContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Live Chat</Text>
            <Text style={styles.viewerCount}>{viewerCount} watching</Text>
          </View>

          <FlatList
            ref={chatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={[
                styles.messageItem,
                item.isGift && styles.giftMessage,
              ]}>
                <Text style={styles.messageText}>
                  <Text style={styles.senderName}>{item.senderName}: </Text>
                  {item.text}
                </Text>
                <Text style={styles.messageTime}>{formatTime(item.timestamp)}</Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>No messages yet</Text>
              </View>
            }
          />

          <View style={styles.chatInput}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              placeholderTextColor="#666"
              value={messageText}
              onChangeText={setMessageText}
              onSubmitEditing={sendMessage}
              multiline
              maxLength={200}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={sendMessage}
              disabled={!messageText.trim()}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
  },
  streamContainer: {
    flex: 1,
    position: 'relative',
  },
  streamVideo: {
    flex: 1,
    backgroundColor: '#222',
  },
  noStreamContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  noStreamText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
  },
  streamOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streamInfo: {
    flex: 1,
    marginHorizontal: 15,
  },
  streamTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  viewerCountText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 5,
  },
  followButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  giftButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  giftButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  chatToggle: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatToggleText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  giftAnimation: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  giftText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  giftPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  giftPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  giftPanelTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  giftsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    justifyContent: 'space-between',
  },
  giftItem: {
    width: (width - 60) / 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
  },
  giftEmoji: {
    fontSize: 30,
    marginBottom: 8,
  },
  giftName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  giftValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  chatTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  messageItem: {
    marginBottom: 10,
  },
  giftMessage: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    padding: 10,
    borderRadius: 10,
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
  },
  senderName: {
    fontWeight: 'bold',
    color: '#00c2ff',
  },
  messageTime: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChatText: {
    color: '#666',
    fontSize: 16,
  },
  chatInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#00c2ff',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ViewerScreen;
