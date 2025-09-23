import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

const INTEREST_TAGS = [
  'Gaming', 'Music', 'Movies', 'Sports', 'Technology', 'Art',
  'Travel', 'Food', 'Fashion', 'Fitness', 'Books', 'Photography',
  'Dancing', 'Cooking', 'Nature', 'Comedy', 'Politics', 'Science',
  'History', 'Languages', 'Cars', 'Pets', 'DIY',
  'Meditation', 'Yoga', 'Anime', 'Manga', 'Crypto'
];

interface PreferencesScreenProps {
  navigation: any;
}

const PreferencesScreen: React.FC<PreferencesScreenProps> = ({ navigation }) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [chatMode, setChatMode] = useState<'video' | 'text'>('video');
  const [anonymousMode, setAnonymousMode] = useState<boolean>(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const savedInterests = await AsyncStorage.getItem('userInterests');
      const savedChatMode = await AsyncStorage.getItem('chatMode');
      const savedAnonymous = await AsyncStorage.getItem('anonymousMode');
      
      if (savedInterests) {
        setSelectedInterests(JSON.parse(savedInterests));
      }
      if (savedChatMode) {
        setChatMode(savedChatMode as 'video' | 'text');
      }
      if (savedAnonymous) {
        setAnonymousMode(JSON.parse(savedAnonymous));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const savePreferences = async () => {
    try {
      await AsyncStorage.setItem('userInterests', JSON.stringify(selectedInterests));
      await AsyncStorage.setItem('chatMode', chatMode);
      await AsyncStorage.setItem('anonymousMode', JSON.stringify(anonymousMode));
      
      Alert.alert('Preferences Saved', 'Your preferences have been saved successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => {
      if (prev.includes(interest)) {
        return prev.filter(item => item !== interest);
      } else {
        return [...prev, interest];
      }
    });
  };

  const renderInterestTag = (interest: string, index: number) => {
    const isSelected = selectedInterests.includes(interest);
    return (
      <TouchableOpacity
        key={`${interest}-${index}`}
        style={[
          styles.interestTag,
          isSelected && styles.selectedInterestTag
        ]}
        onPress={() => toggleInterest(interest)}
      >
        <Text style={[
          styles.interestText,
          isSelected && styles.selectedInterestText
        ]}>
          {interest}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2c3e50" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferences</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Chat Mode Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chat Mode</Text>
          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                chatMode === 'video' && styles.selectedModeButton
              ]}
              onPress={() => setChatMode('video')}
            >
              <Ionicons 
                name="videocam" 
                size={24} 
                color={chatMode === 'video' ? '#fff' : '#666'} 
              />
              <Text style={[
                styles.modeText,
                chatMode === 'video' && styles.selectedModeText
              ]}>
                Video Chat
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modeButton,
                chatMode === 'text' && styles.selectedModeButton
              ]}
              onPress={() => setChatMode('text')}
            >
              <Ionicons 
                name="chatbubble" 
                size={24} 
                color={chatMode === 'text' ? '#fff' : '#666'} 
              />
              <Text style={[
                styles.modeText,
                chatMode === 'text' && styles.selectedModeText
              ]}>
                Text Only
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Anonymous Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <TouchableOpacity
            style={styles.toggleContainer}
            onPress={() => setAnonymousMode(!anonymousMode)}
          >
            <View style={styles.toggleInfo}>
              <Ionicons name="eye-off" size={20} color="#666" />
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleTitle}>Anonymous Mode</Text>
                <Text style={styles.toggleSubtitle}>
                  Hide your profile information from other users
                </Text>
              </View>
            </View>
            <View style={[
              styles.toggle,
              anonymousMode && styles.toggleActive
            ]}>
              <View style={[
                styles.toggleThumb,
                anonymousMode && styles.toggleThumbActive
              ]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Interest Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Interests ({selectedInterests.length} selected)
          </Text>
          <Text style={styles.sectionSubtitle}>
            Select topics you're interested in discussing
          </Text>
          <View style={styles.interestsContainer}>
            {INTEREST_TAGS.map((interest, index) => renderInterestTag(interest, index))}
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={savePreferences}>
          <Text style={styles.saveButtonText}>Save Preferences</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c3e50',
    paddingTop: Platform.OS === 'ios' ? 20 : 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#bdc3c7',
    marginBottom: 15,
  },
  modeContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#34495e',
    backgroundColor: 'transparent',
  },
  selectedModeButton: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  modeText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  selectedModeText: {
    color: '#fff',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  toggleSubtitle: {
    fontSize: 14,
    color: '#bdc3c7',
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#34495e',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#3498db',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestTag: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#34495e',
    backgroundColor: 'transparent',
  },
  selectedInterestTag: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  interestText: {
    fontSize: 14,
    color: '#bdc3c7',
    fontWeight: '500',
  },
  selectedInterestText: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PreferencesScreen;
