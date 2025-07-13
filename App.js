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
    // Production mode
    return 'https://lilibet-backend-production.up.railway.app';
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
        
        <View style={styles.grid}>
          {subjects.map((subject) => (
            <TouchableOpacity
              key={subject.id}
              style={[styles.subjectButton, { backgroundColor: subject.color }]}
              onPress={() => selectSubject(subject)}
            >
              <Ionicons name={subject.icon} size={48} color="white" />
              <Text style={styles.subjectText}>{subject.name}</Text>
              <Text style={styles.subjectSubtext}>Let's learn together!</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  const currentSubjectData = subjects.find(s => s.id === currentSubject);

  // Simple chat layout - no complex responsive behavior
  return (
    <SafeAreaView style={styles.container}>
      {/* Navigation Menu */}
      <NavigationMenu />

      {/* Header */}
      <View style={styles.chatHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.hamburgerButton} onPress={toggleMenu}>
            <Ionicons name="menu" size={20} color="#374151" />
          </TouchableOpacity>
          <View style={[styles.iconContainer, { backgroundColor: currentSubjectData.color }]}>
            <Ionicons name={currentSubjectData.icon} size={20} color="white" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Lilibet Tutor</Text>
            <Text style={styles.headerSubtitle}>{currentSubjectData.name}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.voiceButton, isMuted ? styles.voiceMuted : styles.voiceOn]}
            onPress={toggleMute}
          >
            <Ionicons 
              name={isMuted ? "volume-mute" : "volume-high"} 
              size={16} 
              color={isMuted ? "#dc2626" : "#059669"} 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageRow,
              message.sender === 'user' ? styles.userRow : styles.tutorRow
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                message.sender === 'user' ? styles.userBubble : styles.tutorBubble
              ]}
            >
              <Text style={[
                styles.messageText,
                message.sender === 'user' ? styles.userText : styles.tutorText
              ]}>
                {message.text}
              </Text>
            </View>
          </View>
        ))}
        
        {isLoading && (
          <View style={styles.messageRow}>
            <View style={[styles.messageBubble, styles.tutorBubble]}>
              <Text style={styles.tutorText}>Thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>
      
      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={inputMessage}
          onChangeText={setInputMessage}
          placeholder={isTranscribing ? typingText : "Type or speak your question..."}
          onSubmitEditing={handleSubmit}
          returnKeyType="send"
          editable={!isTranscribing}
        />
        
        <Animated.View style={{ transform: [{ scale: recordingScale }] }}>
          <TouchableOpacity
            style={[
              styles.micButton,
              isRecording ? styles.micRecording : 
              isTranscribing ? styles.micTranscribing : 
              styles.micIdle
            ]}
            onPress={handleMicrophonePress}
            disabled={isTranscribing}
          >
            {isRecording && (
              <Animated.View 
                style={[
                  styles.recordingPulse,
                  { transform: [{ scale: pulseAnim }] }
                ]}
              />
            )}
            <Ionicons 
              name={
                isRecording ? "stop" : 
                isTranscribing ? "hourglass" : 
                "mic"
              } 
              size={18} 
              color={
                isRecording ? "#ffffff" : 
                isTranscribing ? "#f59e0b" : 
                "#6b7280"
              } 
            />
          </TouchableOpacity>
        </Animated.View>
        
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!inputMessage.trim() || isLoading) && styles.sendBtnDisabled
          ]}
          onPress={handleSubmit}
          disabled={!inputMessage.trim() || isLoading}
        >
          <Text style={[
            styles.sendText,
            (!inputMessage.trim() || isLoading) && styles.sendTextDisabled
          ]}>
            Send
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Status indicator for voice processing */}
      {(isRecording || isTranscribing) && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            {isRecording ? "🎤 Listening... Tap stop when done" : 
             isTranscribing ? typingText : ""}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6b21a8',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#9333ea',
    marginBottom: 20,
  },
  // Platform detection styles
  platformInfo: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 10,
  },
  platformText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5b21b6',
  },
  voiceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  voiceOn: {
    backgroundColor: '#dcfce7',
  },
  voiceMuted: {
    backgroundColor: '#fee2e2',
  },
  voiceText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  onText: {
    color: '#059669',
  },
  mutedText: {
    color: '#dc2626',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    gap: 20,
  },
  subjectButton: {
    width: '45%',
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginBottom: 20,
  },
  subjectText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 12,
  },
  subjectSubtext: {
    fontSize: 12,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 8,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hamburgerButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  voiceButton: {
    padding: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    width: screenWidth * 0.75,
    height: '100%',
    backgroundColor: 'white',
    paddingTop: 50,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6b21a8',
  },
  closeButton: {
    padding: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemActive: {
    backgroundColor: '#f0f9ff',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  menuItemTextActive: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    paddingHorizontal: 20,
    paddingVertical: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#e0e7ff',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageRow: {
    marginBottom: 8,
  },
  userRow: {
    alignItems: 'flex-end',
  },
  tutorRow: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
  },
  userBubble: {
    backgroundColor: '#8b5cf6',
  },
  tutorBubble: {
    backgroundColor: 'white',
    borderLeftWidth: 3,
    borderLeftColor: '#c4b5fd',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: 'white',
  },
  tutorText: {
    color: '#1f2937',
  },
  inputBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    marginRight: 8,
  },
  micButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    position: 'relative',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  micIdle: {
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  micRecording: {
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#dc2626',
  },
  micTranscribing: {
    backgroundColor: '#f59e0b',
    borderWidth: 2,
    borderColor: '#d97706',
  },
  recordingPulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ef4444',
    opacity: 0.3,
  },
  sendBtn: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  sendBtnDisabled: {
    backgroundColor: '#d1d5db',
  },
  sendText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  sendTextDisabled: {
    color: '#9ca3af',
  },
  statusBar: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});