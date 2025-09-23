import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Dimensions,
    Modal,
    Pressable,
    StatusBar,
    Image,
    Animated,
    ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Video from 'react-native-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import auth, { signOut, FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { BackHandler, Alert } from 'react-native';

const { width, height } = Dimensions.get('window');

import type { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
    Home: undefined;
    Streame: undefined;
    Login: undefined;
    Preferences: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
    navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
    const [visible, setVisible] = useState(false);
    
    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Entrance animations
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();

        // Pulse animation for the connect button
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        );
        pulseAnimation.start();

        return () => pulseAnimation.stop();
    }, []);

    const handleLogout = async () => {
        await signOut(auth());
    };

 useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (visible) {
          setVisible(false); // 👈 close modal
          return true; // 👈 prevent default back
        }
        return false; // 👈 allow normal back if modal not open
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      return () => backHandler.remove();
    }, [visible])
  );

    const user = auth().currentUser;
    console.log('Current User:', user?.displayName);
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            
            <Video
                source={require('../../assets/chatvideo.mp4')}
                style={styles.backgroundVideo}
                repeat
                resizeMode="cover"
                muted
            />

            {/* Top Header */}
            <SafeAreaView style={styles.safeArea}>
                <Animated.View 
                    style={[
                        styles.header,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => setVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="person-circle" size={44} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>KwickLingo</Text>
                        <Text style={styles.headerSubtitle}>Connect • Chat • Discover</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => navigation.navigate('Preferences')}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="settings" size={24} color="#fff" />
                    </TouchableOpacity>
                </Animated.View>
            </SafeAreaView>
            {/* Center Overlay - Full Height */}
            <Animated.View 
                style={[
                    styles.overlay,
                    {
                        opacity: fadeAnim,
                        transform: [
                            { translateY: slideAnim },
                            { scale: scaleAnim }
                        ]
                    }
                ]}
            >
                {/* Gradient overlay for better text readability */}
                <View style={styles.gradientOverlay} />

                {/* Main content */}
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>Connect Instantly</Text>
                    <Text style={styles.subTitle}>Talk to strangers around the world!</Text>

                    {/* Feature highlights */}
                    <View style={styles.featuresContainer}>
                        <View style={styles.featureItem}>
                            <Ionicons name="globe" size={20} color="#00c2ff" />
                            <Text style={styles.featureText}>Global Community</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="shield-checkmark" size={20} color="#00c2ff" />
                            <Text style={styles.featureText}>Safe & Secure</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="videocam" size={20} color="#00c2ff" />
                            <Text style={styles.featureText}>HD Video Chat</Text>
                        </View>
                    </View>

                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => navigation.navigate('Streame')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.buttonContent}>
                                <Ionicons name="play" size={20} color="#fff" />
                                <Text style={styles.buttonText}>Let's Connect</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Quick stats */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>10K+</Text>
                            <Text style={styles.statLabel}>Active Users</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>50+</Text>
                            <Text style={styles.statLabel}>Countries</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>24/7</Text>
                            <Text style={styles.statLabel}>Available</Text>
                        </View>
                    </View>
                </View>
            </Animated.View>

                {/* Profile Modal */}
                <Modal visible={visible} animationType="slide" transparent>
                    <View style={styles.fullScreenModal}>
                        <View style={styles.profileContainer}>
                            {/* Header */}
                            <View style={styles.profileHeader}>
                                <Text style={styles.profileTitle}>My Profile</Text>
                                <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeButton}>
                                    <Ionicons name="close" color="#fff" size={24} />
                                </TouchableOpacity>
                            </View>

                            {/* Profile Content */}
                            <View style={styles.profileContent}>
                                {/* Profile Picture */}
                                <View style={styles.profilePictureContainer}>
                                    {user?.photoURL ? (
                                        <Image
                                            source={{ uri: user.photoURL }}
                                            style={styles.profilePicture}
                                        />
                                    ) : (
                                        <View style={styles.profilePicturePlaceholder}>
                                            <Ionicons name="person" size={50} color="#fff" />
                                        </View>
                                    )}
                                    <View style={styles.onlineIndicator} />
                                </View>

                                {/* User Info */}
                                <View style={styles.userInfoContainer}>
                                    <Text style={styles.profileName}>{user?.displayName || 'Anonymous User'}</Text>
                                    <Text style={styles.profileEmail}>{user?.email || 'No email provided'}</Text>
                                    <View style={styles.userStats}>
                                        <View style={styles.statItem}>
                                            <Text style={styles.statNumber}>12</Text>
                                            <Text style={styles.statLabel}>Connections</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Text style={styles.statNumber}>5</Text>
                                            <Text style={styles.statLabel}>Hours</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Text style={styles.statNumber}>3.2k</Text>
                                            <Text style={styles.statLabel}>Points</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Action Buttons */}
                                <View style={styles.actionButtons}>
                                    <TouchableOpacity style={styles.actionButton}>
                                        <Ionicons name="settings" size={20} color="#00c2ff" />
                                        <Text style={styles.actionButtonText}>Settings</Text>
                                    </TouchableOpacity>
                                     
                                    <TouchableOpacity style={styles.actionButton}>
                                        <Ionicons name="help-circle" size={20} color="#00c2ff" />
                                        <Text style={styles.actionButtonText}>Help</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity style={styles.actionButton}>
                                        <Ionicons name="share" size={20} color="#00c2ff" />
                                        <Text style={styles.actionButtonText}>Share</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Logout Button */}
                                <TouchableOpacity 
                                    style={styles.logoutButton} 
                                    onPress={() => {
                                        handleLogout();
                                        setVisible(false);
                                    }}
                                >
                                    <Ionicons name="log-out" size={20} color="#fff" />
                                    <Text style={styles.logoutText}>Sign Out</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

        </View>
    );
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    safeArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    backgroundVideo: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: width,
        height: height,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    gradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    contentContainer: {
        alignItems: 'center',
        paddingHorizontal: 30,
        zIndex: 1,
    },
    title: {
        color: '#fff',
        fontSize: 36,
        fontWeight: '800',
        marginBottom: 15,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subTitle: {
        color: '#e8f4fd',
        fontSize: 18,
        marginBottom: 30,
        textAlign: 'center',
        lineHeight: 24,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    featuresContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 40,
        width: '100%',
    },
    featureItem: {
        alignItems: 'center',
        flex: 1,
    },
    featureText: {
        color: '#fff',
        fontSize: 12,
        marginTop: 5,
        textAlign: 'center',
        fontWeight: '500',
    },
    button: {
        backgroundColor: '#00c2ff',
        paddingVertical: 16,
        paddingHorizontal: 50,
        borderRadius: 35,
        elevation: 8,
        shadowColor: '#00c2ff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        marginBottom: 40,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 8,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        paddingVertical: 20,
        paddingHorizontal: 10,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        color: '#00c2ff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    statLabel: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
    header: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 0 : 60,
        width: '100%',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 20 : 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    headerButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerTitleContainer: {
        alignItems: 'center',
        flex: 1,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    headerSubtitle: {
        color: '#e8f4fd',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    overlay2: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalView: {
        backgroundColor: '#fff',
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        width: '80%',
    },
    modalText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 4,
        color: '#2c3e50',
    },
    closeButton: {
        backgroundColor: 'white',
        marginTop: 20,
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 20,
        color: '#fff',
        position: 'absolute',
        bottom: 0,
        left: 20,
    },
    buttonText2: {
        color: '#fff',
        fontWeight: 'bold',
    },
    fullScreenModal: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    profileContainer: {
        backgroundColor: '#1a1a1a',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        paddingBottom: 40,
        minHeight: height * 0.7,
    },
    profileHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    profileTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    profileContent: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    profilePictureContainer: {
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    profilePicture: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#00c2ff',
    },
    profilePicturePlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#333',
        borderWidth: 4,
        borderColor: '#00c2ff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#00ff88',
        borderWidth: 3,
        borderColor: '#1a1a1a',
    },
    userInfoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    profileEmail: {
        fontSize: 16,
        color: '#ccc',
        marginBottom: 20,
    },
    userStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 15,
        paddingVertical: 15,
        paddingHorizontal: 10,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#00c2ff',
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 12,
        color: '#ccc',
        textAlign: 'center',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 30,
    },
    actionButton: {
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 15,
        backgroundColor: 'rgba(0, 194, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(0, 194, 255, 0.3)',
        flex: 1,
        marginHorizontal: 5,
    },
    actionButtonText: {
        color: '#00c2ff',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 5,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e74c3c',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 25,
        marginTop: 10,
    },
    logoutText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },

})
