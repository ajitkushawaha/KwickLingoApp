// src/components/VideoControls.tsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Platform,
  Dimensions,
  Animated,
  Vibration,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface VideoControlsProps {
  isMuted: boolean;
  isVideoEnabled: boolean;
  isFrontCamera: boolean;
  isConnected: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSwitchCamera: () => void;
  onNextPartner: () => void;
  onEndCall: () => void;
}

const VideoControls: React.FC<VideoControlsProps> = ({
  isMuted,
  isVideoEnabled,
  isFrontCamera,
  isConnected,
  onToggleMute,
  onToggleVideo,
  onSwitchCamera,
  onNextPartner,
  onEndCall,
}) => {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for active states
  useEffect(() => {
    if (isMuted || !isVideoEnabled) {
      const pulse = Animated.loop(
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
      pulse.start();
      return () => pulse.stop();
    }
  }, [isMuted, isVideoEnabled]);

  // Haptic feedback
  const triggerHaptic = () => {
    try {
      if (Platform.OS === 'ios') {
        Vibration.vibrate(10);
      } else {
        // Android vibration with permission check
        Vibration.vibrate(50);
      }
    } catch (error) {
      // Silently fail if vibration is not available or permission denied
      console.log('Haptic feedback not available:', error);
    }
  };

  // Button press animation
  const animatePress = (callback: () => void) => {
    // Try haptic feedback, but don't let it block the animation
    triggerHaptic();
    
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    callback();
  };

  // Camera flip animation
  const animateCameraFlip = () => {
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      rotateAnim.setValue(0);
    });
    animatePress(onSwitchCamera);
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Mute Button */}
      <Animated.View style={{ transform: [{ scale: isMuted ? pulseAnim : 1 }] }}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            isMuted && styles.mutedButton,
            styles.iconButton
          ]}
          onPress={() => animatePress(onToggleMute)}
          activeOpacity={0.8}
        >
          <View style={styles.iconContainer}>
            <Ionicons
              name={isMuted ? "mic-off" : "mic"}
              size={24}
              color={isMuted ? "#ff4444" : "#fff"}
            />
          </View>
          <Text style={[styles.controlText, isMuted && styles.activeText]}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Video Toggle Button */}
      <Animated.View style={{ transform: [{ scale: !isVideoEnabled ? pulseAnim : 1 }] }}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            !isVideoEnabled && styles.videoDisabledButton,
            styles.iconButton
          ]}
          onPress={() => animatePress(onToggleVideo)}
          activeOpacity={0.8}
        >
          <View style={styles.iconContainer}>
            <Ionicons
              name={isVideoEnabled ? "videocam" : "videocam-off"}
              size={24}
              color={!isVideoEnabled ? "#ff4444" : "#fff"}
            />
          </View>
          <Text style={[styles.controlText, !isVideoEnabled && styles.activeText]}>
            {isVideoEnabled ? 'Hide' : 'Show'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Camera Flip Button */}
      <TouchableOpacity
        style={[styles.controlButton, styles.iconButton]}
        onPress={animateCameraFlip}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="camera-reverse"
              size={24}
              color="#fff"
            />
          </View>
        </Animated.View>
        <Text style={styles.controlText}>Flip</Text>
      </TouchableOpacity>

      {/* Next Partner Button */}
      <TouchableOpacity
        style={[
          styles.controlButton,
          styles.nextButton,
          !isConnected && styles.disabledButton
        ]}
        onPress={() => animatePress(onNextPartner)}
        disabled={!isConnected}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name="arrow-forward"
            size={24}
            color={isConnected ? "#fff" : "#666"}
          />
        </View>
        <Text style={[styles.controlText, !isConnected && styles.disabledText]}>
          Next
        </Text>
      </TouchableOpacity>

      {/* End Call Button */}
      <TouchableOpacity
        style={[styles.controlButton, styles.endCallButton, styles.iconButton]}
        onPress={() => {
          // Add delay to prevent accidental end call
          setTimeout(() => {
            animatePress(onEndCall);
          }, 100);
        }}
        activeOpacity={0.8}
        delayPressIn={50}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name="call"
            size={24}
            color="#fff"
          />
        </View>
        <Text style={styles.controlText}>End</Text>
      </TouchableOpacity>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 10,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 200,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width / 6,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  iconButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    // width: 40,
    // height: 40,
    // borderRadius: 20,
    // backgroundColor: 'rgba(255, 255, 255, 0.1)',
    // alignItems: 'center',
    // justifyContent: 'center',
    // marginBottom: 5,
    // borderWidth: 1,
    // borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  mutedButton: {
    backgroundColor: 'rgba(255, 68, 68, 0.3)',
    borderColor: 'rgba(255, 68, 68, 0.5)',
    shadowColor: '#ff4444',
    shadowOpacity: 0.3,
  },
  videoDisabledButton: {
    backgroundColor: 'rgba(255, 68, 68, 0.3)',
    borderColor: 'rgba(255, 68, 68, 0.5)',
    shadowColor: '#ff4444',
    shadowOpacity: 0.3,
  },
  nextButton: {
    backgroundColor: 'rgba(0, 194, 255, 0.3)',
    borderColor: 'rgba(0, 194, 255, 0.5)',
    shadowColor: '#00c2ff',
    shadowOpacity: 0.3,
  },
  endCallButton: {
    backgroundColor: 'rgba(255, 68, 68, 0.4)',
    borderColor: 'rgba(255, 68, 68, 0.6)',
    shadowColor: '#ff4444',
    shadowOpacity: 0.4,
  },
  disabledButton: {
    backgroundColor: 'rgba(100, 100, 100, 0.2)',
    borderColor: 'rgba(100, 100, 100, 0.3)',
    shadowOpacity: 0.1,
  },
  controlText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  activeText: {
    color: '#ff4444',
    fontWeight: '700',
  },
  disabledText: {
    color: '#666',
    fontWeight: '400',
  },
});

export default VideoControls;