// src/screens/VideoChatScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';

// Get screen dimensions
const { width, height } = Dimensions.get('window');
import { PanGestureHandler, PinchGestureHandler, State } from 'react-native-gesture-handler';
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
import { connect, disconnect, joinQueue, leaveQueue, sendSignalingMessage, testServerConnection, isConnected } from '../service/signaling';
import VideoControls from '../components/VideoControls';
import ReportModal from '../components/ReportModal';
import SkipButton from '../components/SkipButton';
import { getCurrentUser } from '../service/auth';
import { requestVideoCallPermissions } from '../utils/permissions';
import { CONFIG } from '../config/config';
import Ionicons from 'react-native-vector-icons/Ionicons';

type VideoChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Streame'>;

interface VideoChatScreenProps {
  navigation: VideoChatScreenNavigationProp;
}

interface ChatMessage {
  id: string;
  text: string;
  sender: 'me' | 'partner';
  timestamp: number;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
} 

const VideoChatScreen: React.FC<VideoChatScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState<boolean>(true);
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(true);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [chatMode, setChatMode] = useState<'video' | 'text'>('video');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [partnerTyping, setPartnerTyping] = useState<boolean>(false);
  const [chatHeight, setChatHeight] = useState<number>(0);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [isSkipping, setIsSkipping] = useState<boolean>(false);
  const [videoKey, setVideoKey] = useState<number>(0);
  const [streamReady, setStreamReady] = useState<boolean>(false);
  const [componentMounted, setComponentMounted] = useState<boolean>(false);
  const [forceVideoRender, setForceVideoRender] = useState<number>(0);
  const [videoComponentKey, setVideoComponentKey] = useState<string>('initial');
  
  // Local video position and size state
  const [localVideoPosition, setLocalVideoPosition] = useState({ x: width - (width / 4) - 20, y: 20 });
  const [localVideoSize, setLocalVideoSize] = useState({ width: width / 4, height: height / 4 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  // Gesture state tracking
  const [lastPanTranslation, setLastPanTranslation] = useState({ x: 0, y: 0 });
  const [lastPinchScale, setLastPinchScale] = useState(1);
  const [initialSize, setInitialSize] = useState({ width: width / 4, height: height / 4 });

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const userId = useRef<string | null>(null);
  const chatListRef = useRef<FlatList>(null);
  const lastTapRef = useRef<number>(0);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const chatSlideAnim = useRef(new Animated.Value(300)).current;
  const chatOpacityAnim = useRef(new Animated.Value(0)).current;
  const messageSlideAnim = useRef(new Animated.Value(50)).current;
  const controlsOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Force re-render state for video
  const [forceRender, setForceRender] = useState(0);

  // Initialize animations and component
  useEffect(() => {
    // Set component as mounted immediately
    setComponentMounted(true);
    
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
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for connecting state
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, []);

  // Enhanced chat animation effects
  useEffect(() => {
    if (showChat) {
      // Show chat - slide up from bottom with fade in
      Animated.parallel([
        Animated.timing(chatSlideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(chatOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Hide chat - slide down with fade out
      Animated.parallel([
        Animated.timing(chatSlideAnim, {
          toValue: 300,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(chatOpacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showChat]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // Animate message slide in
      Animated.timing(messageSlideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [messages.length]);

  // Force re-render when local stream changes
  useEffect(() => {
    if (localStream) {
      console.log('🔄 Local stream changed, forcing re-render...');
      setForceRender(prev => prev + 1);
      setVideoKey(prev => prev + 1); // Force RTCView re-render
      setForceVideoRender(prev => prev + 1);
      
      // Additional delay to ensure video renders
      setTimeout(() => {
        console.log('🔄 Additional re-render triggered...');
        setForceRender(prev => prev + 1);
        setVideoKey(prev => prev + 1);
        setForceVideoRender(prev => prev + 1);
      }, 100);
    }
  }, [localStream]);

  // Special effect for first load video rendering
  useEffect(() => {
    if (localStream && streamReady && componentMounted) {
      console.log('🎯 First load video rendering - forcing aggressive re-render...');
      
      // Change video component key to force complete remount
      setVideoComponentKey(`video-${Date.now()}-${Math.random()}`);
      
      // Immediate aggressive re-render
      setForceVideoRender(prev => prev + 1);
      setVideoKey(prev => prev + 1);
      setForceRender(prev => prev + 1);
      
      // Multiple rapid re-renders for first load
      [10, 25, 50, 75, 100, 150, 200, 300, 500].forEach((delay, index) => {
        setTimeout(() => {
          console.log(`🎯 First load re-render ${index + 1} at ${delay}ms...`);
          setForceVideoRender(prev => prev + 1);
          setVideoKey(prev => prev + 1);
          setForceRender(prev => prev + 1);
          setVideoComponentKey(`video-${Date.now()}-${Math.random()}`);
        }, delay);
      });
    }
  }, [localStream, streamReady, componentMounted]);

  // Force re-render when remote stream changes
  useEffect(() => {
    if (remoteStream) {
      console.log('🔄 Remote stream changed, forcing re-render...');
      setForceRender(prev => prev + 1);
      setVideoKey(prev => prev + 1); // Force RTCView re-render
      
      // Additional delay to ensure video renders
      setTimeout(() => {
        console.log('🔄 Additional remote re-render triggered...');
        setForceRender(prev => prev + 1);
        setVideoKey(prev => prev + 1);
      }, 100);
    }
  }, [remoteStream]);

  // Initialize WebRTC and get user media
  useEffect(() => {
    const setupWebRTC = async () => {
      try {
        console.log('🚀 Starting VideoChatScreen setup...');
        
        // Test server connection first (before requesting permissions)
        console.log('🧪 Testing server connection...');
        const serverOnline = await testServerConnection();
        if (!serverOnline) {
          console.log('❌ Server connection test failed');
          Alert.alert(
            'Server Connection Error',
            'Cannot connect to the signaling server. Please check:\n\n1. Server is running on port 3000\n2. Your internet connection\n3. Firewall settings\n\nFor Android emulator, make sure you\'re using 10.0.2.2:3000',
            [
              { text: 'Retry', onPress: () => setupWebRTC() },
              { text: 'Go Back', onPress: () => navigation.goBack() }
            ]
          );
          setLoading(false);
          return;
        }
        console.log('✅ Server connection test passed');

        // Request permissions after server check
        console.log('🔐 Requesting permissions...');
        const permissionsGranted = await requestVideoCallPermissions();
        if (!permissionsGranted) {
          console.log('❌ Permissions not granted');
          setLoading(false);
          return;
        }
        console.log('✅ Permissions granted');

        // Get current user ID from Firebase
        const user = await getCurrentUser();
        if (user) {
          userId.current = user.uid;
        }

        // Initialize camera and microphone stream
        console.log('📹 Getting user media...');
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: {
            facingMode: isFrontCamera ? 'user' : 'environment',
            width: 640,
            height: 480,
          },
        });

        setLocalStream(stream);
        setStreamReady(true); // Set immediately when stream is obtained
        console.log('✅ User media obtained successfully');
        console.log('📹 Stream details:', {
          id: stream.id,
          active: stream.active,
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length,
          streamURL: stream.toURL()
        });
        
        // Force immediate re-render for local video
        setTimeout(() => {
          console.log('🔄 Forcing local video re-render...');
          setForceRender(prev => prev + 1);
        }, 100);

        // Simplified stream ready check
        const waitForStreamReady = () => {
          return new Promise<void>((resolve) => {
            let attempts = 0;
            const maxAttempts = 10; // 1 second max wait
            
            const checkStream = () => {
              attempts++;
              console.log(`⏳ Checking stream readiness (attempt ${attempts}/${maxAttempts})...`);
              
              if (stream && stream.active) {
                console.log('✅ Stream is active, proceeding...');
                setStreamReady(true);
                resolve();
                return;
              }
              
              if (attempts >= maxAttempts) {
                console.log('⚠️ Stream ready timeout, proceeding anyway...');
                setStreamReady(true);
                resolve();
              } else {
                setTimeout(checkStream, 100);
              }
            };
            checkStream();
          });
        };

        await waitForStreamReady();

        // Connect to signaling server
        console.log('🔌 Connecting to signaling server...');
        connect();

        // Set loading to false immediately after getting stream
        setLoading(false);
        console.log('📱 Loading set to false, video should be visible now');
        
        // Aggressive video re-rendering strategy
        const forceVideoRenders = () => {
          console.log('🔄 Starting aggressive video re-render sequence...');
          
          // Immediate re-render
          setVideoKey(prev => prev + 1);
          setForceRender(prev => prev + 1);
          setForceVideoRender(prev => prev + 1);
          
          // Multiple timed re-renders
          [50, 100, 200, 400, 600, 1000, 1500, 2000].forEach((delay, index) => {
            setTimeout(() => {
              console.log(`🔄 Video re-render ${index + 2} at ${delay}ms...`);
              setVideoKey(prev => prev + 1);
              setForceRender(prev => prev + 1);
              setForceVideoRender(prev => prev + 1);
              
              // Force stream ready if not already set
              if (!streamReady) {
                console.log('🔄 Forcing stream ready state...');
                setStreamReady(true);
              }
            }, delay);
          });
        };
        
        forceVideoRenders();

        // Fallback timeout to ensure loading is set to false
        setTimeout(() => {
          if (loading) {
            console.log('⚠️ Fallback: Forcing loading to false...');
            setLoading(false);
            setStreamReady(true);
          }
        }, 3000);

        // Wait for connection and then proceed
        setTimeout(() => {
          if (isConnected()) {
            console.log('✅ Connected! Setting up video chat...');
            // Listen for signaling events
            listenForSignalingEvents();

            // Join the queue to find a chat partner
            searchForPartner();
          } else {
            console.log('❌ Connection failed!');
            Alert.alert(
              'Connection Failed',
              'Failed to establish connection with the server. Please try again.\n\nThis might be due to:\n• Network connectivity issues\n• Server not responding\n• Firewall blocking the connection\n• Android emulator network configuration',
              [
                { text: 'Retry', onPress: () => setupWebRTC() },
                { text: 'Go Back', onPress: () => navigation.goBack() }
              ]
            );
          }
        }, 3000);
      } catch (error) {
        console.error('❌ Error setting up WebRTC:', error);
        setLoading(false);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        Alert.alert(
          'Setup Error',
          `Failed to setup video chat: ${errorMessage}\n\nThis might be due to:\n• Camera/microphone permissions not granted\n• Device doesn't support video calling\n• Network connectivity issues`,
          [
            { text: 'Retry', onPress: () => setupWebRTC() },
            { text: 'Go Back', onPress: () => navigation.goBack() }
          ]
        );
      }
    };

    setupWebRTC();

    // Cleanup function
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      leaveQueue();
      disconnect();   
    };
  }, [navigation]);

  // Listen for signaling events from the server
  const listenForSignalingEvents = () => {
    // Partner found event
    global.socketIO.on('partner-found', async (data: { partnerId: string; initiator?: boolean }) => {
      console.log('Partner found:', data.partnerId);
      setPartnerId(data.partnerId);
      setConnecting(true);
      
      // Create peer connection
      await createPeerConnection();
      
      // If we are the initiator, create and send offer
      if (data.initiator) {
        // Use the partnerId from the event data directly
        await createOfferWithPartnerId(data.partnerId);
      }
    });
 
    // No partner found event
    global.socketIO.on('no-partner-available', () => {
      setConnecting(false);
      Alert.alert(
        'No Partners Available',
        'No one is available to chat right now. Please try again later.',
        [
          { 
            text: 'Try Again', 
            onPress: searchForPartner 
          },
          { 
            text: 'Go Back', 
            onPress: () => navigation.goBack() 
          }
        ]
      ); 
    });

    // WebRTC signaling events
    global.socketIO.on('webrtc-offer', async (data: { sdp: RTCSessionDescription, senderId?: string }) => {
      console.log('📨 Received WebRTC offer:', data);
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
        console.log('✅ Set remote description from offer');
        
        // Use current partnerId or senderId if available
        const targetId = partnerId || data.senderId;
        if (targetId) {
          await createAnswerWithPartnerId(targetId);
        } else {
          console.error('❌ Cannot create answer: no targetId available');
        }
      }
    });

    global.socketIO.on('webrtc-answer', async (data: { sdp: RTCSessionDescription }) => {
      console.log('📨 Received WebRTC answer:', data);
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
        console.log('✅ Set remote description from answer');
      }
    });

    global.socketIO.on('webrtc-ice-candidate', async (data: { candidate: RTCIceCandidate }) => {
      console.log('🧊 Received ICE candidate:', data);
      if (peerConnection.current) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log('✅ Added ICE candidate');
      }
    });

    // Partner disconnected event
    global.socketIO.on('partner-disconnected', () => {
      handlePartnerDisconnect();
    });

    // Enhanced chat event handlers
    global.socketIO.on('chat-message', (data: { text: string, senderId: string }) => {
      if (data.senderId !== userId.current) {
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          text: data.text,
          sender: 'partner',
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, newMessage]);
      }
    });

    global.socketIO.on('typing-start', () => {
      setPartnerTyping(true);
    });

    global.socketIO.on('typing-stop', () => {
      setPartnerTyping(false);
    });
  };

  // Create WebRTC peer connection
  const createPeerConnection = async () => {
    try {
      // STUN/TURN servers configuration
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      };

      const pc = new RTCPeerConnection(configuration);
      peerConnection.current = pc;

      // Add local stream tracks to peer connection
      if (localStream) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });
      }

      // Set up remote stream handling
      (pc as any).ontrack = (event: any) => {
        console.log('🎥 ontrack event received:', event);
        console.log('🎥 Event streams:', event.streams);
        console.log('🎥 Event track:', event.track);
        
        if (event.streams && event.streams[0]) {
          console.log('✅ Setting remote stream:', event.streams[0]);
          console.log('📹 Remote stream details:', {
            id: event.streams[0].id,
            active: event.streams[0].active,
            videoTracks: event.streams[0].getVideoTracks().length,
            audioTracks: event.streams[0].getAudioTracks().length,
            streamURL: event.streams[0].toURL()
          });
          setRemoteStream(event.streams[0]);
          setConnected(true);
          setConnecting(false);
          setVideoKey(prev => prev + 1); // Force video refresh
        } else if (event.track) {
          // Fallback: handle single track
          console.log('🎥 Handling single track:', event.track);
          const stream = new MediaStream([event.track]);
          setRemoteStream(stream);
          setConnected(true);
          setConnecting(false);
          setVideoKey(prev => prev + 1); // Force video refresh
        } else {
          console.log('❌ No streams or tracks in ontrack event');
        }
      };

      // Handle ICE candidates
      (pc as any).onicecandidate = (event: any) => {
        if (event.candidate) {
          sendSignalingMessage('webrtc-ice-candidate', {
            targetId: partnerId,
            candidate: event.candidate,
          });
        }
      };

      // Connection state changes
      (pc as any).oniceconnectionstatechange = () => {
        const state = (pc as any).iceConnectionState;
        console.log('🔗 ICE connection state:', state);
        console.log('🔗 ICE gathering state:', (pc as any).iceGatheringState);
        console.log('🔗 Connection state:', (pc as any).connectionState);
        
        if (state === 'connected' || state === 'completed') {
          console.log('✅ WebRTC connection established!');
          // Check for remote streams after connection is established
          setTimeout(() => {
            if (peerConnection.current && !remoteStream) {
              console.log('🔍 Checking for remote streams after connection...');
              const receivers = (peerConnection.current as any).getReceivers();
              console.log('📡 Receivers:', receivers);
              
              receivers.forEach((receiver: any, index: number) => {
                console.log(`📡 Receiver ${index}:`, {
                  track: receiver.track,
                  trackKind: receiver.track?.kind,
                  trackEnabled: receiver.track?.enabled,
                  trackReadyState: receiver.track?.readyState
                });
                
                if (receiver.track && receiver.track.kind === 'video') {
                  console.log('🎥 Found video track in receiver, creating stream...');
                  const stream = new MediaStream([receiver.track]);
                  setRemoteStream(stream);
                  setConnected(true);
                  setConnecting(false);
                }
              });
            }
          }, 2000);
        } else if (state === 'disconnected' || state === 'failed') {
          console.log('❌ WebRTC connection failed or disconnected');
          handlePartnerDisconnect();
        }
      };

      return pc;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      return null;
    }
  };

  // Create and send WebRTC offer
  const createOffer = async () => {
    if (!partnerId) {
      console.error('❌ Cannot create offer: partnerId is null');
      return;
    }
    await createOfferWithPartnerId(partnerId);
  };

  // Create and send WebRTC offer with specific partner ID
  const createOfferWithPartnerId = async (targetPartnerId: string) => {
    try {
      console.log('🎯 Creating WebRTC offer for partner:', targetPartnerId);
      if (!peerConnection.current) {
        console.log('❌ No peer connection available for offer');
        return;
      }

      const offer = await peerConnection.current.createOffer({});
      console.log('✅ Created offer:', offer);
      await peerConnection.current.setLocalDescription(offer);
      console.log('✅ Set local description for offer');

      sendSignalingMessage('webrtc-offer', {
        targetId: targetPartnerId,
        sdp: peerConnection.current.localDescription,
      });
      console.log('📤 Sent offer to partner:', targetPartnerId);
    } catch (error) {
      console.error('❌ Error creating offer:', error);
    }
  };

  // Create and send WebRTC answer
  const createAnswer = async () => {
    if (!partnerId) {
      console.error('❌ Cannot create answer: partnerId is null');
      return;
    }
    await createAnswerWithPartnerId(partnerId);
  };

  // Create and send WebRTC answer with specific partner ID
  const createAnswerWithPartnerId = async (targetPartnerId: string) => {
    try {
      console.log('🎯 Creating WebRTC answer for partner:', targetPartnerId);
      if (!peerConnection.current) {
        console.log('❌ No peer connection available for answer');
        return;
      }

      const answer = await peerConnection.current.createAnswer();
      console.log('✅ Created answer:', answer);
      await peerConnection.current.setLocalDescription(answer);
      console.log('✅ Set local description for answer');

      sendSignalingMessage('webrtc-answer', {
        targetId: targetPartnerId,
        sdp: peerConnection.current.localDescription,
      });
      console.log('📤 Sent answer to partner:', targetPartnerId);
    } catch (error) {
      console.error('❌ Error creating answer:', error);
    }
  };

  // Search for a chat partner
  const searchForPartner = () => {
    setConnecting(true);
    setConnected(false);
    setRemoteStream(null);
    setPartnerId(null);
    setMessages([]);
    setIsSkipping(false);
    
    // Close previous peer connection if exists
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Join the queue to find a partner
    joinQueue();
  };

  // Skip to next partner
  const skipToNextPartner = () => {
    setIsSkipping(true);
    setConnected(false);
    setRemoteStream(null);
    setPartnerId(null);
    setMessages([]);
    
    // Close current connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Leave current queue and find new partner
    leaveQueue();
    setTimeout(() => {
      searchForPartner();
    }, 1000);
  };

  // Handle user report
  const handleReport = (reason: string, description: string) => {
    console.log('Reporting user:', partnerId, 'Reason:', reason, 'Description:', description);
    // Here you would typically send the report to your backend
    // For now, we'll just log it
    Alert.alert('Report Submitted', 'Thank you for your report. We will review it and take appropriate action.');
  };

  // Handle partner disconnection
  const handlePartnerDisconnect = () => {
    setConnected(false);
    setRemoteStream(null);
    Alert.alert(
      'Partner Disconnected',
      'Your chat partner has disconnected.',
      [
        { 
          text: 'Find New Partner', 
          onPress: searchForPartner 
        },
        { 
          text: 'Go Home', 
          onPress: () => navigation.navigate('Home') 
        }
      ]
    );
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

  // Toggle camera
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Switch camera (front/back)
  const switchCamera = async () => {
    console.log('🔄 Switching camera from', isFrontCamera ? 'front' : 'back', 'to', !isFrontCamera ? 'front' : 'back');
    
    if (localStream) {
      // Stop current stream
      console.log('🛑 Stopping current stream tracks...');
      localStream.getTracks().forEach(track => track.stop());

      try {
        // Get new stream with opposite camera
        const newFacingMode = isFrontCamera ? 'environment' : 'user';
        console.log('📹 Getting new stream with facing mode:', newFacingMode);
        
        const newStream = await mediaDevices.getUserMedia({
          audio: true,
          video: {
            facingMode: newFacingMode,
            width: 640,
            height: 480,
          },
        });

        console.log('✅ New stream obtained:', {
          id: newStream.id,
          active: newStream.active,
          videoTracks: newStream.getVideoTracks().length,
          audioTracks: newStream.getAudioTracks().length,
          streamURL: newStream.toURL()
        });

        setLocalStream(newStream);
        setIsFrontCamera(!isFrontCamera);
        console.log('✅ Camera switched to:', !isFrontCamera ? 'front' : 'back');

        // Update peerConnection with new stream
        if (peerConnection.current) {
          console.log('🔄 Updating peer connection with new stream...');
          const senders = peerConnection.current.getSenders();
          const videoTrack = newStream.getVideoTracks()[0];
          
          console.log('📡 Current senders:', senders.length);
          
          const videoSender = senders.find(sender => 
            sender.track?.kind === 'video'
          );
          
          if (videoSender && videoTrack) {
            console.log('✅ Replacing video track in peer connection');
            await videoSender.replaceTrack(videoTrack);
            console.log('✅ Video track replaced successfully');
          } else {
            console.log('❌ No video sender or track found for replacement');
          }
        } else {
          console.log('❌ No peer connection available for track replacement');
        }
      } catch (error) {
        console.error('❌ Error switching camera:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        Alert.alert(
          'Camera Switch Error',
          `Failed to switch camera: ${errorMessage}\n\nThis might be due to:\n• Camera permissions not granted\n• Camera already in use\n• Device doesn't support multiple cameras`,
          [{ text: 'OK' }]
        );
      }
    } else {
      console.log('❌ No local stream available for camera switch');
      Alert.alert(
        'No Video Stream',
        'No video stream is currently active. Please start a video call first.',
        [{ text: 'OK' }]
      );
    }
  };

  // Enhanced chat functions
  const sendMessage = () => {
    if (messageText.trim() === '' || !partnerId) return;

    const messageId = Date.now().toString();
    const newMessage: ChatMessage = {
      id: messageId,
      text: messageText.trim(),
      sender: 'me',
      timestamp: Date.now(),
      status: 'sending',
    };

    // Add message to local state immediately
    setMessages(prev => [...prev, newMessage]);
    
    // Send to server
    sendSignalingMessage('chat-message', {
      targetId: partnerId,
      text: messageText.trim(),
    });

    setMessageText('');

    // Simulate message delivery
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: 'sent' }
            : msg
        )
      );
    }, 1000);
  };

  const handleChatInputChange = (text: string) => {
    setMessageText(text);
    
    // Send typing indicator
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      sendSignalingMessage('typing-start', { targetId: partnerId });
    } else if (text.length === 0 && isTyping) {
      setIsTyping(false);
      sendSignalingMessage('typing-stop', { targetId: partnerId });
    }
  };

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageStatusIcon = (status?: string) => {
    switch (status) {
      case 'sending': return '⏳';
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'read': return '✓✓';
      default: return '';
    }
  };

  // Add message to chat
  const addMessage = (text: string, sender: 'me' | 'partner') => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: Date.now(),
    };

    setMessages(prevMessages => [...prevMessages, newMessage]);
    
    // Scroll to bottom of chat
    setTimeout(() => {
      if (chatListRef.current) {
        chatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  // Handle pan gesture for moving local video
  const onPanGestureEvent = (event: any) => {
    if (isDragging) {
      const { translationX, translationY } = event.nativeEvent;
      
      // Calculate new position based on current position + translation
      const newX = Math.max(0, Math.min(width - localVideoSize.width, localVideoPosition.x + translationX - lastPanTranslation.x));
      const newY = Math.max(0, Math.min(height - localVideoSize.height, localVideoPosition.y + translationY - lastPanTranslation.y));
      
      setLocalVideoPosition({ x: newX, y: newY });
      setLastPanTranslation({ x: translationX, y: translationY });
    }
  };

  const onPanHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.BEGAN) {
      setIsDragging(true);
      setLastPanTranslation({ x: 0, y: 0 });
    } else if (event.nativeEvent.state === State.END) {
      setIsDragging(false);
      setLastPanTranslation({ x: 0, y: 0 });
    }
  };

  // Handle pinch gesture for resizing local video
  const onPinchGestureEvent = (event: any) => {
    if (isResizing) {
      const { scale } = event.nativeEvent;
      
      // Calculate scale relative to initial size
      const scaleFactor = scale / lastPinchScale;
      const newWidth = Math.max(width / 8, Math.min(width / 2.5, initialSize.width * scale));
      const newHeight = Math.max(height / 8, Math.min(height / 2.5, initialSize.height * scale));
      
      setLocalVideoSize({ width: newWidth, height: newHeight });
      setLastPinchScale(scale);
    }
  };
 
  const onPinchHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.BEGAN) {
      setIsResizing(true);
      setInitialSize(localVideoSize);
      setLastPinchScale(1);
    } else if (event.nativeEvent.state === State.END) {
      setIsResizing(false);
      setLastPinchScale(1);
    }
  };

  // Reset local video position and size
  const resetLocalVideo = () => {
    setLocalVideoPosition({ x: width - (width / 4) - 20, y: 20 });
    setLocalVideoSize({ width: width / 4, height: height / 4 });
  };

  // Simple initial render - always show loading first
  if (!componentMounted || loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00c2ff" />
          <Text style={styles.loadingText}>Setting up video chat...</Text>
          <Text style={styles.loadingSubtext}>Please wait while we prepare your connection</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Debug info for development */}
      {/* {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>
            Server: {CONFIG.SERVER.SIGNALING_URL} | 
            Connected: {isConnected() ? 'Yes' : 'No'} | 
            Loading: {loading ? 'Yes' : 'No'}
          </Text>
          <Text style={styles.debugText}>
            Local Stream: {localStream ? 'Yes' : 'No'} | 
            Stream Ready: {streamReady ? 'Yes' : 'No'} | 
            Component Mounted: {componentMounted ? 'Yes' : 'No'} | 
            Force Render: {forceVideoRender}
          </Text>
          <Text style={styles.debugText}>
            Remote Stream: {remoteStream ? 'Yes' : 'No'} | 
            Partner: {partnerId || 'None'} | 
            Video Key: {videoKey}
          </Text>
          <Text style={styles.debugText}>
            Video Enabled: {isVideoEnabled ? 'Yes' : 'No'} | 
            Muted: {isMuted ? 'Yes' : 'No'} | 
            Connecting: {connecting ? 'Yes' : 'No'}
          </Text>
          <Text style={styles.debugText}>
            Camera: {isFrontCamera ? 'Front' : 'Back'} | 
            Mirror: {isFrontCamera ? 'Yes' : 'No'} | 
            Local Stream: {localStream ? 'Active' : 'None'}
          </Text>
        </View>
      )} */}
      
      {!loading && (
        <View style={styles.contentContainer}>
          <Animated.View 
            style={[
              styles.videoContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            {/* Remote video (partner) - Top full width */}
            <View style={styles.remoteVideoContainer}>
              {remoteStream ? (
                <RTCView
                  key={`remote-${videoComponentKey}-${videoKey}-${remoteStream.id}-${forceRender}-${forceVideoRender}`}
                  streamURL={remoteStream.toURL()}
                  style={styles.remoteVideo}
                  objectFit="cover"
                  zOrder={0}
                />
              ) : connecting ? (
                <Animated.View 
                  style={[
                    styles.connectingContainer,
                    { transform: [{ scale: pulseAnim }] }
                  ]}
                >
                  <View style={styles.connectingIconContainer}>
                    <Ionicons name="people" size={60} color="#00c2ff" />
                  </View>
                  <ActivityIndicator size="large" color="#00c2ff" style={{ marginVertical: 20 }} />
                  <Text style={styles.connectingText}>
                    {partnerId ? 'Connecting to partner...' : 'Finding a partner...'}
                  </Text>
                  <Text style={styles.connectingSubtext}>
                    {partnerId ? 'Please wait while we establish the connection' : 'Searching for someone to chat with'}
                  </Text>
                </Animated.View>
              ) : (
                <Animated.View 
                  style={[
                    styles.noPartnerContainer,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }]
                    }
                  ]}
                >
                  <View style={styles.noPartnerIconContainer}>
                    <Ionicons name="person-add" size={80} color="#00c2ff" />
                  </View>
                  <Text style={styles.noPartnerText}>Ready to Connect</Text>
                  <Text style={styles.noPartnerSubtext}>Start a new conversation with someone around the world</Text>
                  <TouchableOpacity 
                    style={styles.findButton}
                    onPress={searchForPartner}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="search" size={20} color="#fff" />
                    <Text style={styles.findButtonText}>Find Partner</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>

            {/* Local video (self) - Bottom full width */}
            <View style={styles.localVideoContainerBottom}>
              {localStream ? (
                <RTCView
                  key={`local-simple-${localStream.id}-${forceRender}`}
                  streamURL={localStream.toURL()}
                  style={[
                    styles.localVideoBottom,
                    !isVideoEnabled && styles.videoDisabled
                  ]}
                  objectFit="cover"
                  zOrder={1}
                  mirror={isFrontCamera}
                />
              ) : (
                <View style={styles.streamLoadingContainer}>
                  <ActivityIndicator size="small" color="#00c2ff" />
                  <Text style={styles.streamLoadingText}>
                    {streamReady ? 'No stream' : 'Preparing video...'}
                  </Text>
                </View>
              )}
              
              {/* Debug indicator */}
              {__DEV__ && (
                <View style={styles.debugIndicator}>
                  <Text style={styles.debugIndicatorText}>
                    Local: {localStream ? 'Yes' : 'No'} | 
                    Ready: {streamReady ? 'Yes' : 'No'}
                  </Text>
                </View>
              )}
            </View>

            {/* Top Controls */}
            <Animated.View  
              style={[
                styles.topControls,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              {/* Back button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>

              {/* Connection status */}
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusIndicator,
                  { backgroundColor: connected ? '#00ff88' : connecting ? '#ffaa00' : '#ff4444' }
                ]} />
                <Text style={styles.statusText}>
                  {connected ? 'Connected' : connecting ? 'Connecting...' : 'Disconnected'}
                </Text>
              </View>

              {/* Chat toggle button */}
              <TouchableOpacity
                style={[styles.chatToggleButton, showChat && styles.chatToggleButtonActive]}
                onPress={() => {
                  console.log('💬 Chat button pressed, showChat:', !showChat);
                  setShowChat(!showChat);
                }}
                activeOpacity={0.7}
              > 
                <Ionicons  
                  name={showChat ? "chatbubbles" : "chatbubble-outline"} 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.chatToggleText}>
                  {showChat ? 'Hide' : 'Chat'}
                </Text>
              </TouchableOpacity>

              {/* Report button */}
              {connected && (
                <TouchableOpacity
                  style={styles.reportButton}
                  onPress={() => setShowReportModal(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="flag" size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </Animated.View>

            {/* Skip Button */}
            {connected && (
              <Animated.View 
                style={[
                  styles.skipButtonContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }]
                  }
                ]}
              >
                <SkipButton
                  onSkip={skipToNextPartner}
                  disabled={isSkipping}
                  loading={isSkipping}
                />
              </Animated.View>
            )}

            {/* Video controls component */}
            <VideoControls
              isMuted={isMuted}
              isVideoEnabled={isVideoEnabled}
              isFrontCamera={isFrontCamera}
              isConnected={connected}
              onToggleMute={toggleMute}
              onToggleVideo={toggleVideo}
              onSwitchCamera={switchCamera}
              onNextPartner={searchForPartner}
              onEndCall={() => navigation.navigate('Home')}
            />
          </Animated.View>

          {/* Enhanced Chat Modal */}
          {showChat && (
            <Animated.View
              style={[
                styles.chatContainer,
                {
                  transform: [{ translateY: chatSlideAnim }],
                  opacity: chatOpacityAnim,
                },
              ]}
            >
              {/* Chat Header */}
              <View style={styles.chatHeader}>
                <Text style={styles.chatTitle}>Chat</Text>
                <TouchableOpacity
                  style={styles.chatCloseButton}
                  onPress={() => setShowChat(false)}
                >
                  <Text style={styles.chatCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Messages Container */}
              <FlatList
                ref={chatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => {
                  if (chatListRef.current) {
                    chatListRef.current.scrollToEnd({ animated: true });
                  }
                }}
                renderItem={({ item, index }) => (
                  <Animated.View
                    key={item.id}
                    style={[
                      styles.messageContainer,
                      item.sender === 'me' ? styles.myMessage : styles.partnerMessage,
                      {
                        transform: [{ translateY: messageSlideAnim }],
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        item.sender === 'me' ? styles.myBubble : styles.partnerBubble,
                      ]}
                    >
                      <Text style={styles.messageText}>{item.text}</Text>
                      <View style={styles.messageFooter}>
                        <Text style={styles.messageTime}>
                          {formatMessageTime(item.timestamp)}
                        </Text>
                        {item.sender === 'me' && (
                          <Text style={styles.messageStatus}>
                            {getMessageStatusIcon(item.status)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </Animated.View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyChatContainer}>
                    <Ionicons name="chatbubble-outline" size={40} color="#666" />
                    <Text style={styles.emptyChatText}>No messages yet</Text>
                    <Text style={styles.emptyChatSubtext}>Start the conversation!</Text>
                  </View>
                }
              />

              {/* Typing Indicator */}
              {partnerTyping && (
                <View style={styles.typingContainer}>
                  <View style={styles.typingBubble}>
                    <Text style={styles.typingText}>Partner is typing...</Text>
                    <View style={styles.typingDots}>
                      <Animated.View style={[styles.typingDot, { opacity: 0.3 }]} />
                      <Animated.View style={[styles.typingDot, { opacity: 0.6 }]} />
                      <Animated.View style={[styles.typingDot, { opacity: 1 }]} />
                    </View>
                  </View>
                </View>
              )}

              {/* Chat Input */}
              <View style={styles.chatInputContainer}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Type a message..."
                  placeholderTextColor="#666"
                  value={messageText}
                  onChangeText={handleChatInputChange}
                  onSubmitEditing={sendMessage}
                  multiline
                  maxLength={500}
                  editable={connected}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    messageText.trim() && connected ? styles.sendButtonActive : styles.sendButtonInactive,
                  ]}
                  onPress={sendMessage}
                  disabled={!messageText.trim() || !connected}
                >
                  <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Report Modal */}
          <ReportModal
            visible={showReportModal}
            onClose={() => setShowReportModal(false)}
            onReport={handleReport}
            partnerId={partnerId || undefined}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 10,
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
  },
  contentContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 20 : 60,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
    height: height,
    width: width,
    backgroundColor: '#000',
    zIndex: 1,
  },
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: '#222',
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#222',
  },
  localVideoContainerBottom: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  localVideoBottom: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  localVideoContainer: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#00c2ff',
    shadowColor: '#00c2ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
    zIndex: 2,
  },
  localVideo: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 9,
  },
  localVideoTouchable: {
    flex: 1,
  },
  dragHandle: {
    position: 'absolute',
    top: 5,
    left: 5,
    flexDirection: 'row',
    opacity: 0.7,
  },
  dragHandleDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
    marginRight: 2,
  },
  resizeHandle: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 12,
    height: 12,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#00c2ff',
    borderBottomRightRadius: 4,
  },
  videoDisabled: {
    backgroundColor: '#444',
  },
  connectingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 40,
  },
  connectingIconContainer: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 194, 255, 0.1)',
  },
  connectingText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  connectingSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
  },
  noPartnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 40,
  },
  noPartnerIconContainer: {
    marginBottom: 30,
    padding: 25,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 194, 255, 0.1)',
  },
  noPartnerText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  noPartnerSubtext: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  findButton: {
    backgroundColor: '#00c2ff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#00c2ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  findButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  topControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 0 : 20,
    left: 20,
    right: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
  },
  backButton: {
    padding: 10,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  chatToggleButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatToggleButtonActive: {
    backgroundColor: 'rgba(0, 194, 255, 0.8)',
  },
  chatToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  reportButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  skipButtonContainer: {
    position: 'absolute',
    top: '50%',
    right: 20,
    transform: [{ translateY: -25 }],
    zIndex: 150,
  },
  chatContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    zIndex: 1000,
    elevation: 1000,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  chatCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  messagesContent: {
    paddingVertical: 10,
  },
  messageContainer: {
    marginVertical: 5,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  partnerMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  myBubble: {
    backgroundColor: '#00c2ff',
    borderBottomRightRadius: 5,
  },
  partnerBubble: {
    backgroundColor: '#333',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  messageTime: {
    color: '#999',
    fontSize: 12,
  },
  messageStatus: {
    color: '#999',
    fontSize: 12,
    marginLeft: 5,
  },
  typingContainer: {
    alignItems: 'flex-start',
    marginVertical: 5,
  },
  typingBubble: {
    backgroundColor: '#333',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    color: '#999',
    fontSize: 14,
    marginRight: 10,
  },
  typingDots: {
    flexDirection: 'row',
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#999',
    marginHorizontal: 1,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#00c2ff',
  },
  sendButtonInactive: {
    backgroundColor: '#555',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyChatText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  emptyChatSubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 5,
  },
  debugContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 5,
    zIndex: 1000,
  },
  debugText: {
    color: '#00ff00',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  streamLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  streamLoadingText: {
    color: '#00c2ff',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  debugIndicator: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 4,
    borderRadius: 4,
    zIndex: 10,
  },
  debugIndicatorText: {
    color: '#00ff00',
    fontSize: 8,
    fontFamily: 'monospace',
  },
  chatDebugIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 4,
    borderRadius: 4,
    zIndex: 1001,
  },
  chatDebugText: {
    color: '#00ff00',
    fontSize: 8,
    fontFamily: 'monospace',
  },
});

export default VideoChatScreen;