import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import Swiper from 'react-native-swiper';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

// 🎨 Modern Theme Colors
const theme = {
  gradients: {
    primary: ['#667eea', '#764ba2'],
    secondary: ['#f093fb', '#f5576c'],
    tertiary: ['#4facfe', '#00f2fe'],
    quaternary: ['#43e97b', '#38f9d7'],
  },
  colors: {
    primary: '#667eea',
    secondary: '#764ba2',
    accent: '#00c2ff',
    text: '#2c3e50',
    textLight: '#7f8c8d',
    white: '#ffffff',
    black: '#000000',
  },
};

const Welcome = ({ navigation }: any) => {
  const swiperRef = useRef<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const slides = [
    {
      title: 'Welcome to KwickLingo',
      subtitle: 'Your Gateway to Global Connections',
      desc: 'Connect with people from around the world instantly through video calls and chat.',
      gradient: theme.gradients.primary,
      icon: 'globe-outline',
      features: ['Instant Video Calls', 'Global Community', 'Safe & Secure'],
    },
    {
      title: 'Meet New People',
      subtitle: 'Discover Amazing Conversations',
      desc: 'Find interesting people from 190+ countries and start meaningful conversations.',
      gradient: theme.gradients.secondary,
      icon: 'people-outline',
      features: ['Random Matching', 'Interest-Based', 'Real-time Chat'],
    },
    {
      title: 'Safe & Private',
      subtitle: 'Your Privacy Matters',
      desc: 'End-to-end encrypted video calls with advanced privacy protection and reporting system.',
      gradient: theme.gradients.tertiary,
      icon: 'shield-checkmark-outline',
      features: ['End-to-End Encryption', 'Privacy Protection', 'Report System'],
    },
    {
      title: 'Ready to Connect?',
      subtitle: 'Start Your Journey',
      desc: 'Join thousands of users worldwide and start making new friends today!',
      gradient: theme.gradients.quaternary,
      icon: 'rocket-outline',
      features: ['Easy Setup', 'Instant Access', '24/7 Available'],
    },
  ];

  React.useEffect(() => {
    // Start entrance animations
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
  }, []);

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem('hasSeenWelcome', 'true');
      console.log('✅ Welcome screen completed, navigating to Login...');
      // Use reset to clear the navigation stack and go to Login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('❌ Error saving welcome state:', error);
      // Still try to navigate even if AsyncStorage fails
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Swiper
        ref={swiperRef}
        loop={false}
        dot={<View style={styles.dot} />}
        activeDot={<View style={styles.activeDot} />}
        paginationStyle={styles.pagination}
        onIndexChanged={(index) => setCurrentIndex(index)}
      >
        {slides.map((slide, index) => (
          <LinearGradient
            key={index}
            colors={slide.gradient}
            style={styles.slide}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideAnim },
                    { scale: scaleAnim },
                  ],
                },
              ]}
            >
              {/* Icon */}
              <View style={styles.iconContainer}>
                <Ionicons name={slide.icon} size={80} color={theme.colors.white} />
              </View>

              {/* Title */}
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>

              {/* Description */}
              <Text style={styles.desc}>{slide.desc}</Text>

              {/* Features */}
              <View style={styles.featuresContainer}>
                {slide.features.map((feature, featureIndex) => (
                  <View key={featureIndex} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.white} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* Navigation Buttons */}
            <View style={styles.buttonContainer}>
              {index !== slides.length - 1 ? (
                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={() => swiperRef.current.scrollBy(1)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nextButtonText}>Next</Text>
                  <Ionicons name="arrow-forward" size={20} color={theme.colors.white} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.getStartedButton}
                  onPress={handleGetStarted}
                  activeOpacity={0.8}
                >
                  <Text style={styles.getStartedButtonText}>Get Started</Text>
                  <Ionicons name="rocket" size={20} color={theme.colors.white} />
                </TouchableOpacity>
              )}

              {/* Skip Button */}
              {index !== slides.length - 1 && (
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleGetStarted}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        ))}
      </Swiper>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  slide: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  desc: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  featuresContainer: {
    width: '100%',
    marginTop: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  featureText: {
    fontSize: 16,
    color: theme.colors.white,
    marginLeft: 12,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 20,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  getStartedButtonText: {
    color: theme.colors.primary,
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 8,
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  skipButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '500',
  },
  dot: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: theme.colors.white,
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  pagination: {
    bottom: Platform.OS === 'ios' ? 50 : 30,
  },
});

export default Welcome;
