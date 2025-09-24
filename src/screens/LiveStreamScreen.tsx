// src/screens/LiveStreamScreen.tsx
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
  mediaDevices,
} from 'react-native-webrtc';
import { connect, disconnect, sendSignalingMessage } from '../service/signaling';
import { getCurrentUser } from '../service/auth';
import { requestVideoCallPermissions } from '../utils/permissions';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

type LiveStreamScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LiveStream'>;

interface LiveStreamScreenProps {
  navigation: LiveStreamScreenNavigationProp;
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

interface Viewer {
  id: string;
  name: string;
  isFollowing: boolean;
}

const LiveStreamScreen: React.FC<LiveStreamScreenProps> = ({ navigation }) => {
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [streamTitle, setStreamTitle] = useState<string>('');
  const [streamDescription, setStreamDescription] = useState<string>('');
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [showChat, setShowChat] = useState<boolean>(true);
  const [showGiftPanel, setShowGiftPanel] = useState<boolean>(false);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(true);

  const userId = useRef<string | null>(null);
  const streamId = useRef<string | null>(null);
  const chatListRef = useRef<FlatList>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const giftAnim = useRef(new Animated.Value(0)).current;
  const viewerCountAnim = useRef(new Animated.Value(0)).current;

  // Initialize component
  useEffect(() => {
    const initializeStream = async () => {
      try {
        console.log('🎥 Initializing Live Stream...');

        // Get current user
        const user = await getCurrentUser();
        if (!user) {
          Alert.alert('Error', 'Please login to start streaming');
          navigation.goBack();
          return;
        }
        userId.current = user.uid;
        streamId.current = `stream_${user.uid}_${Date.now()}`;

        // Request permissions
        const hasPermissions = await requestVideoCallPermissions();
        if (!hasPermissions) {
          Alert.alert('Permissions Required', 'Camera and microphone permissions are required for live streaming');
          navigation.goBack();
          return;
        }

        // Get user media
        const stream = await mediaDevices.getUserMedia({
          video: {
            facingMode: isFrontCamera ? 'user' : 'environment',
            width: 1280,
            height: 720,
          },
          audio: true,
        });

        setLocalStream(stream);
        setIsLoading(false);

        // Connect to signaling server
        await connect();

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

        // Listen for live stream events
        setupLiveStreamEvents();

      } catch (error) {
        console.error('❌ Failed to initialize live stream:', error);
        Alert.alert('Stream Error', 'Failed to initialize live stream. Please try again.');
        setIsLoading(false);
      }
    };

    initializeStream();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      disconnect();
    };
  }, []);

  // Setup live stream events
  const setupLiveStreamEvents = () => {
    // Viewer joined
    global.socketIO.on('viewer-joined', (data: { viewer: Viewer }) => {
      setViewers(prev => [...prev, data.viewer]);
      setViewerCount(prev => prev + 1);

      // Animate viewer count
      Animated.timing(viewerCountAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        viewerCountAnim.setValue(0);
      });
    });

    // Viewer left
    global.socketIO.on('viewer-left', (data: { viewerId: string }) => {
      setViewers(prev => prev.filter(v => v.id !== data.viewerId));
      setViewerCount(prev => Math.max(0, prev - 1));
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
      setTotalEarnings(prev => prev + data.value);

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
  };

  // Start live stream
  const startStream = async () => {
    if (!streamTitle.trim()) {
      Alert.alert('Stream Title Required', 'Please enter a title for your stream');
      return;
    }

    try {
      setIsStreaming(true);

      // Send stream start event to server
      sendSignalingMessage('start-live-stream', {
        streamId: streamId.current,
        title: streamTitle,
        description: streamDescription,
        streamerId: userId.current,
      });

      console.log('🎥 Live stream started!');
    } catch (error) {
      console.error('❌ Failed to start stream:', error);
      Alert.alert('Stream Error', 'Failed to start live stream');
      setIsStreaming(false);
    }
  };

  // End live stream
  const endStream = async () => {
    try {
      setIsStreaming(false);

      // Send stream end event to server
      sendSignalingMessage('end-live-stream', {
        streamId: streamId.current,
        streamerId: userId.current,
      });

      // Save stream stats
      await AsyncStorage.setItem('lastStreamEarnings', totalEarnings.toString());

      Alert.alert(
        'Stream Ended',
        `Your stream earned $${totalEarnings.toFixed(2)}!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('❌ Failed to end stream:', error);
    }
  };

  // Toggle camera
  const toggleCamera = async () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Toggle microphone
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Switch camera
  const switchCamera = async () => {
    try {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      const newStream = await mediaDevices.getUserMedia({
        video: {
          facingMode: !isFrontCamera ? 'user' : 'environment',
          width: 1280,
          height: 720,
        },
        audio: true,
      });

      setLocalStream(newStream);
      setIsFrontCamera(!isFrontCamera);
    } catch (error) {
      console.error('❌ Failed to switch camera:', error);
    }
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
        <Text style={styles.loadingText}>Setting up live stream...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Stream Preview */}
      <View style={styles.streamContainer}>
        {localStream ? (
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.streamVideo}
            objectFit="cover"
            mirror={isFrontCamera}
          />
        ) : (
          <View style={styles.noStreamContainer}>
            <Ionicons name="videocam-off" size={60} color="#666" />
            <Text style={styles.noStreamText}>Camera not available</Text>
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
              <Text style={styles.streamTitle}>{streamTitle || 'Untitled Stream'}</Text>
              <Animated.View style={[styles.viewerCount, { transform: [{ scale: viewerCountAnim }] }]}>
                <Ionicons name="eye" size={16} color="#fff" />
                <Text style={styles.viewerCountText}>{viewerCount}</Text>
              </Animated.View>
            </View>

            <TouchableOpacity
              style={styles.chatToggle}
              onPress={() => setShowChat(!showChat)}
            >
              <Ionicons name={showChat ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            <View style={styles.controlGroup}>
              <TouchableOpacity
                style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                onPress={toggleMute}
              >
                <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]}
                onPress={toggleCamera}
              >
                <Ionicons name={isVideoEnabled ? 'videocam' : 'videocam-off'} size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={switchCamera}
              >
                <Ionicons name="camera-reverse" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.streamActions}>
              {!isStreaming ? (
                <TouchableOpacity
                  style={styles.startStreamButton}
                  onPress={startStream}
                >
                  <Ionicons name="radio" size={20} color="#fff" />
                  <Text style={styles.startStreamText}>Go Live</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.endStreamButton}
                  onPress={endStream}
                >
                  <Ionicons name="stop" size={20} color="#fff" />
                  <Text style={styles.endStreamText}>End Stream</Text>
                </TouchableOpacity>
              )}
            </View>
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
          <Text style={styles.giftText}>🎁 Gift Received!</Text>
        </Animated.View>
      </View>

      {/* Stream Setup Panel */}
      {!isStreaming && (
        <Animated.View
          style={[
            styles.setupPanel,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.setupTitle}>Stream Setup</Text>

          <TextInput
            style={styles.titleInput}
            placeholder="Stream Title"
            placeholderTextColor="#666"
            value={streamTitle}
            onChangeText={setStreamTitle}
            maxLength={100}
          />

          <TextInput
            style={styles.descriptionInput}
            placeholder="Stream Description (Optional)"
            placeholderTextColor="#666"
            value={streamDescription}
            onChangeText={setStreamDescription}
            multiline
            maxLength={500}
          />
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
            <Text style={styles.earningsText}>${totalEarnings.toFixed(2)}</Text>
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
    color: '#666',
    fontSize: 16,
    marginTop: 10,
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
  chatToggle: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  controlGroup: {
    flexDirection: 'row',
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
  },
  streamActions: {
    flexDirection: 'row',
  },
  startStreamButton: {
    backgroundColor: '#ff4444',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  startStreamText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  endStreamButton: {
    backgroundColor: '#666',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  endStreamText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  setupPanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  setupTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  titleInput: {
    backgroundColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 15,
  },
  descriptionInput: {
    backgroundColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    height: 80,
    textAlignVertical: 'top',
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
  earningsText: {
    color: '#00c2ff',
    fontSize: 16,
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
});

export default LiveStreamScreen;
