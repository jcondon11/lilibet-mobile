import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  TextInput, 
  ScrollView,
  Dimensions,
  Alert,
  Animated,
  Modal,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

// Import our platform-specific utilities
import { createRecording } from './utils/audioRecording';
import { speakMessage, stopSpeaking } from './utils/speechSynthesis';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// PRODUCTION: Smart server URL detection
const getServerUrl = () => {
  if (__DEV__) {
    // Development mode
    return isWeb ? 'http://localhost:3001' : 'http://192.168.86.58:3001';
  } else {
    // Production mode - we'll update this URL after deploying backend
    return 'https://lilibet-backend.production.up.railway.app';
  }
};

export default function App() {
  const [currentSubject, setCurrentSubject] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Voice OFF by default
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [typingText, setTypingText] = useState(''); // For typing animation
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const scrollViewRef = useRef(null);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingScale = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-screenWidth * 0.75)).current;

  const subjects = [
    { id: 'math', name: 'Math', icon: 'calculator', color: '#3b82f6' },
    { id: 'reading', name: 'Reading', icon: 'book', color: '#10b981' },
    { id: 'writing', name: 'Writing', icon: 'create', color: '#8b5cf6' },
    { id: 'science', name: 'Science', icon: 'flask', color: '#ef4444' }
  ];

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Menu animation effect
  useEffect(() => {
    if (isMenuOpen) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -screenWidth * 0.75,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isMenuOpen]);

  // Pulse animation for recording
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      
      // Scale animation for recording button
      Animated.timing(recordingScale, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      return () => {
        pulse.stop();
      };
    } else {
      pulseAnim.setValue(1);
      Animated.timing(recordingScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isRecording]);

  // Typing animation effect
  useEffect(() => {
    if (isTranscribing) {
      setTypingText('');
      const messages = [
        'Transcribing your speech...',
        'Converting to text...',
        'Almost ready...'
      ];
      
      let messageIndex = 0;
      let charIndex = 0;
      
      const typeInterval = setInterval(() => {
        if (messageIndex < messages.length) {
          const currentMessage = messages[messageIndex];
          if (charIndex < currentMessage.length) {
            setTypingText(currentMessage.substring(0, charIndex + 1));
            charIndex++;
          } else {
            setTimeout(() => {
              messageIndex++;
              charIndex = 0;
              if (messageIndex >= messages.length) {
                setTypingText('Processing...');
              }
            }, 1000);
          }
        }
      }, 50);
      
      return () => {
        clearInterval(typeInterval);
        setTypingText('');
      };
    }
  }, [isTranscribing]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // UPDATED: Platform-specific speech function
  const handleSpeakMessage = async (text) => {
    if (isMuted) return;
    
    try {
      setIsSpeaking(true);
      await speakMessage(text, {
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.log('Speech error:', error);
      setIsSpeaking(false);
    }
  };

  const toggleMute = async () => {
    if (!isMuted) {
      // If muting, stop any current speech
      await stopSpeaking();
      setIsSpeaking(false);
    }
    setIsMuted(!isMuted);
  };

  const handleMicrophonePress = async () => {
    if (isTranscribing) {
      return;
    }
    
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  // UPDATED: Platform-specific recording with better web error handling
  const startRecording = async () => {
    try {
      console.log('=== Starting Recording Process ===');
      console.log('Platform:', Platform.OS);
      
      setInputMessage('');
      setTypingText('');
      
      // Platform-specific permission handling
      if (!isWeb) {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Microphone Access Needed', 
            'Please allow microphone access so I can hear your questions',
            [{ text: 'OK' }]
          );
          return;
        }
      } else {
        // For web, check if mediaDevices is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          Alert.alert('Browser Error', 'Your browser does not support microphone recording. Please use Chrome, Firefox, or Edge.');
          return;
        }
      }

      console.log('Creating recording...');
      
      // Use our platform-specific recording function
      const { recording } = await createRecording();
      
      setRecording(recording);
      setIsRecording(true);
      console.log('✅ Recording started successfully');
      
    } catch (err) {
      console.error('❌ Failed to start recording:', err);
      if (isWeb) {
        if (err.name === 'NotAllowedError') {
          Alert.alert('Microphone Permission', 'Please allow microphone access in your browser settings and try again.');
        } else if (err.name === 'NotFoundError') {
          Alert.alert('No Microphone', 'No microphone found. Please connect a microphone and try again.');
        } else {
          Alert.alert('Recording Error', `Could not access microphone: ${err.message}`);
        }
      } else {
        Alert.alert('Recording Error', 'Could not start recording. Please try again.');
      }
    }
  };

  const stopRecording = async () => {
    try {
      console.log('=== Stopping Recording ===');
      setIsRecording(false);
      setIsTranscribing(true);
      
      if (!recording) {
        console.error('No recording object found');
        setIsTranscribing(false);
        return;
      }
      
      await recording.stopAndUnloadAsync();
      
      // Reset audio mode for mobile
      if (!isWeb) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          shouldDuckAndroid: false,
        });
      }
      
      const uri = recording.getURI();
      console.log('✅ Recording stopped, URI:', uri);
      setRecording(null);
      
      if (uri) {
        await transcribeAudio(uri);
      } else {
        console.error('No recording URI found');
        setIsTranscribing(false);
        Alert.alert('Recording Error', 'No audio was recorded. Please try again.');
      }
      
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      setIsTranscribing(false);
      Alert.alert('Processing Error', 'Could not process recording. Please try again.');
    }
  };

  // UPDATED: Platform-specific transcription with FIXED web FormData
  const transcribeAudio = async (audioUri) => {
    try {
      console.log('=== Starting Transcription ===');
      
      // Create form data - different for web vs mobile
      const formData = new FormData();
      
      if (isWeb) {
        // Web: Get the File object from our WebAudioRecording
        const audioFile = recording.getFile();
        if (audioFile) {
          formData.append('audio', audioFile, 'recording.webm');
          console.log('Web: Appended file to FormData:', audioFile.name, audioFile.size);
        } else {
          throw new Error('No audio file available');
        }
      } else {
        // Mobile: Use the URI
        formData.append('audio', {
          uri: audioUri,
          type: 'audio/m4a',
          name: 'recording.m4a',
        });
      }

      console.log('Sending audio to server...');
      
      // PRODUCTION: Use dynamic server URL
      const serverUrl = getServerUrl();
      console.log('Using server URL:', serverUrl);
      
      // FIXED: Don't set Content-Type header for FormData on web - let browser set it
      const fetchOptions = {
        method: 'POST',
        body: formData,
      };
      
      // Only set Content-Type for mobile
      if (!isWeb) {
        fetchOptions.headers = {
          'Content-Type': 'multipart/form-data',
        };
      }
      
      const response = await fetch(`${serverUrl}/api/speech-to-text`, fetchOptions);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', errorText);
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Transcription response:', data);
      
      if (data.success && data.text && data.text.trim()) {
        const transcribedText = data.text.trim();
        console.log('✅ Transcription successful:', transcribedText);
        
        setTypingText('Got it! You said: ');
        setTimeout(() => {
          setInputMessage(transcribedText);
          setTypingText('');
        }, 500);
        
      } else {
        console.log('⚠️ Empty or failed transcription');
        setTypingText('');
        Alert.alert(
          'Didn\'t catch that', 
          'I couldn\'t hear you clearly. Try speaking a bit louder and closer to your device.',
          [{ text: 'Try Again' }]
        );
      }
      
    } catch (error) {
      console.error('❌ Transcription error:', error);
      setTypingText('');
      Alert.alert(
        'Voice Recognition Error', 
        'Something went wrong with voice recognition. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const getTutorResponse = async (userMessage, subject) => {
    try {
      // PRODUCTION: Use dynamic server URL
      const serverUrl = getServerUrl();
      
      const response = await fetch(`${serverUrl}/api/tutor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          subject: subject,
          conversationHistory: messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get tutor response');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error calling backend:', error);
      const fallbackResponses = {
        math: "What do you think the first step should be?",
        reading: "What clues in the text helped you think that?",
        writing: "What feeling are you trying to share?",
        science: "What do you think might happen if we changed one thing?"
      };
      return fallbackResponses[subject] || "That's a great question! What do you think?";
    }
  };

  const handleSubmit = async () => {
    if (!inputMessage.trim() || !currentSubject || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const tutorResponse = await getTutorResponse(inputMessage, currentSubject);
      const tutorMessage = {
        id: Date.now() + 1,
        text: tutorResponse,
        sender: 'tutor',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, tutorMessage]);
      
      // Speak the response if voice is enabled
      if (!isMuted) {
        setTimeout(() => handleSpeakMessage(tutorResponse), 500);
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: "Could you try asking me again?",
        sender: 'tutor',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectSubject = (subject) => {
    setCurrentSubject(subject.id);
    const welcomeMessage = {
      id: Date.now(),
      text: `Hi! I'm Lilibet, your tutor! I'm here to help you learn ${subject.name} by asking questions. What would you like to work on?`,
      sender: 'tutor',
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages([welcomeMessage]);
    
    setIsMenuOpen(false);
    
    // Speak welcome message if voice is enabled
    if (!isMuted) {
      setTimeout(() => handleSpeakMessage(welcomeMessage.text), 500);
    }
  };

  const goHome = async () => {
    setCurrentSubject('');
    setMessages([]);
    setInputMessage('');
    setTypingText('');
    setIsMenuOpen(false);
    
    // Stop any current speech
    await stopSpeaking();
    setIsSpeaking(false);
    
    // Stop any recording
    if (isRecording && recording) {
      await recording.stopAndUnloadAsync();
      setIsRecording(false);
      setRecording(null);
    }
    setIsTranscribing(false);
  };

  // Simple Navigation Menu Component - no complex responsive layout
  const NavigationMenu = () => (
    <Modal
      visible={isMenuOpen}
      transparent={true}
      animationType="none"
      onRequestClose={closeMenu}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={closeMenu}
      >
        <Animated.View 
          style={[
            styles.menuContainer,
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>🌟 Navigation</Text>
              <TouchableOpacity onPress={closeMenu} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Platform Detection Display */}
            <View style={styles.menuItem}>
              <Text style={styles.menuItemText}>
                Platform: {Platform.OS} {Platform.OS === 'web' ? '🌐' : '📱'}
              </Text>
            </View>

            {/* Environment Display */}
            <View style={styles.menuItem}>
              <Text style={styles.menuItemText}>
                Mode: {__DEV__ ? 'Development 🛠️' : 'Production 🚀'}
              </Text>
            </View>

            {/* Server URL Display */}
            <View style={styles.menuItem}>
              <Text style={[styles.menuItemText, { fontSize: 12 }]}>
                Server: {getServerUrl()}
              </Text>
            </View>

            <TouchableOpacity style={styles.menuItem} onPress={goHome}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#6b21a8' }]}>
                <Ionicons name="home" size={20} color="white" />
              </View>
              <Text style={styles.menuItemText}>Home</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <Text style={styles.menuSectionTitle}>Subjects</Text>
            {subjects.map((subject) => (
              <TouchableOpacity
                key={subject.id}
                style={[
                  styles.menuItem,
                  currentSubject === subject.id && styles.menuItemActive
                ]}
                onPress={() => selectSubject(subject)}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: subject.color }]}>
                  <Ionicons name={subject.icon} size={20} color="white" />
                </View>
                <Text style={[
                  styles.menuItemText,
                  currentSubject === subject.id && styles.menuItemTextActive
                ]}>
                  {subject.name}
                </Text>
                {currentSubject === subject.id && (
                  <Ionicons name="checkmark-circle" size={20} color={subject.color} />
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={toggleMute}>
              <View style={[
                styles.menuIconContainer, 
                { backgroundColor: isMuted ? '#dc2626' : '#059669' }
              ]}>
                <Ionicons 
                  name={isMuted ? "volume-mute" : "volume-high"} 
                  size={20} 
                  color="white" 
                />
              </View>
              <Text style={styles.menuItemText}>
                Voice {isMuted ? 'Off' : 'On'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );

  // Home screen - same for all platforms
  if (!currentSubject) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🌟 Lilibet Tutor 🌟</Text>
          <Text style={styles.subtitle}>Your friendly learning companion!</Text>
          
          {/* Platform Detection Display */}
          <View style={styles.platformInfo}>
            <Text style={styles.platformText}>
              Running on: {Platform.OS} {Platform.OS === 'web' ? '🌐' : '📱'}
            </Text>
          </View>

          {/* Environment Detection Display */}
          <View style={[styles.platformInfo, { backgroundColor: __DEV__ ? '#fff3cd' : '#d1ecf1' }]}>
            <Text style={[styles.platformText, { color: __DEV__ ? '#856404' : '#0c5460' }]}>
              Mode: {__DEV__ ? 'Development 🛠️' : 'Production 🚀'}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.voiceToggle, isMuted ? styles.voiceMuted : styles.voiceOn]}
            onPress={toggleMute}
          >
            <Ionicons 
              name={isMuted ? "volume-mute" : "volume-high"} 
              size={20} 
              color={isMuted ? "#dc2626" : "#059669"} 
            />
            <Text style={[styles.voiceText, isMuted ? styles.mutedText : styles.onText]}>
              {isMuted ? "Voice Off" : "Voice On"}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={