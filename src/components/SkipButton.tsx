import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface SkipButtonProps {
  onSkip: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const SkipButton: React.FC<SkipButtonProps> = ({ onSkip, disabled = false, loading = false }) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (disabled || loading) {return;}

    // Animate button press
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

    onSkip();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.skipButton,
          disabled && styles.disabledButton,
          loading && styles.loadingButton,
        ]}
        onPress={handlePress}
        disabled={disabled || loading}
      >
        <View style={styles.buttonContent}>
          <Ionicons
            name={loading ? 'refresh' : 'arrow-forward'}
            size={20}
            color={disabled ? '#999' : '#fff'}
          />
          <Text style={[
            styles.skipText,
            disabled && styles.disabledText,
          ]}>
            {loading ? 'Finding...' : 'Skip'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  skipButton: {
    backgroundColor: '#e67e22',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
    elevation: 0,
    shadowOpacity: 0,
  },
  loadingButton: {
    backgroundColor: '#3498db',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disabledText: {
    color: '#999',
  },
});

export default SkipButton;
