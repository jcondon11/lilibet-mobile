// App.js - Complete File with Conversation History Access
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

// Import authentication
import { AuthProvider, useAuth } from './AuthContext';
import { AuthScreen } from './AuthScreen';
import { ConversationHistory } from './ConversationHistory';

// Import existing utilities
import { createRecording } from './utils/audioRecording';
import { speakMessage, stopSpeaking } from './utils/speechSynthesis';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Main App Component
const LilibetApp = () => {
  const auth = useAuth();
  
  // All state variables
  const [currentSubject, setCurrentSubject] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('openai');
  const [availableModels, setAvailableModels] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  
  const scrollViewRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingScale = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-screenWidth * 0.75)).current;

  const subjects = [
    { id: 'math', name: 'Math', icon: 'calculator', color: '#3b82f6' },
    { id: 'reading', name: 'Reading', icon: 'book', color: '#10b981' },
    { id: 'writing', name: 'Writing', icon: 'create', color: '#8b5cf6' },
    { id: 'science', name: 'Science', icon: 'flask', color: '#ef4444' }
  ];

  const modelConfigs = {
    openai: {
      name: 'OpenAI',
      icon: 'flash',
      color: '#10b981',
      description: 'GPT-4o-mini - Great for broad knowledge'
    },
    claude: {
      name: 'Claude',
      icon: 'library',
      color: '#8b5cf6',
      description: 'Anthropic Claude - Excellent reasoning'
    }
  };

  // Auto-save conversation after every complete message exchange
  useEffect(() => {
    if (messages.length > 0 && currentSubject && auth.isAuthenticated) {
      // Save immediately after each message exchange (user + tutor response)
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.sender === 'tutor') {
        // Only save when tutor has responded (complete exchange)
        handleSaveConversation();
      } else {
        // Mark as unsaved when user sends a message
        setHasUnsavedChanges(true);
      }
    }
  }, [messages, currentSubject]);

  // Save conversation function (now instant)
  const handleSaveConversation = async () => {
    if (!auth.isAuthenticated || !currentSubject || messages.length === 0) return;

    try {
      const result = await auth.saveConversation(
        currentSubject,
        messages,
        'middle',
        selectedModel,
        `${currentSubject} session - ${new Date().toLocaleDateString()}`
      );

      if (result.success) {
        setHasUnsavedChanges(false);
        setCurrentConversationId(result.conversationId);
        console.log('💾 Conversation saved instantly');
      }
    } catch (error) {
      console.log('Save failed:', error);
    }
  };

  // Show loading screen
  if (auth.isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.loadingText}>Loading Lilibet...</Text>
      </SafeAreaView>
    );
  }

  // Show login screen if not authenticated
  if (!auth.isAuthenticated) {
    return <AuthScreen />;
  }

  // Get server URL
  const getServerUrl = () => {
    if (__DEV__) {
      return isWeb ? 'http://localhost:3001' : 'http://192.168.86.58:3001';
    } else {
      return 'https://lilibet-backend-production.up.railway.app';
    }
  };

  // Get tutor response
  const getTutorResponse = async (userMessage, subject) => {
    try {
      const serverUrl = getServerUrl();
      
      const headers = {
        'Content-Type': 'application/json',
      };

      if (auth.token) {
        headers['Authorization'] = `Bearer ${auth.token}`;
      }
      
      const response = await fetch(`${serverUrl}/api/tutor`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMessage,
          subject: subject,
          model: selectedModel,
          conversationHistory: messages
            .filter(msg => msg.sender !== 'system')
            .map(msg => ({
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
      return "That's a great question! What do you think?";
    }
  };

  // Handle message submission
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
    setHasUnsavedChanges(true); // Mark as unsaved when new message added

    try {
      const tutorResponse = await getTutorResponse(inputMessage, currentSubject);
      const tutorMessage = {
        id: Date.now() + 1,
        text: tutorResponse,
        sender: 'tutor',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, tutorMessage]);
      
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

  // Speech function
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
      await stopSpeaking();
      setIsSpeaking(false);
    }
    setIsMuted(!isMuted);
  };

  // Select subject
  const selectSubject = (subjectId) => {
    setCurrentSubject(subjectId);
    
    const subject = subjects.find(s => s.id === subjectId);
    const welcomeMessage = {
      id: Date.now(),
      text: `Hello ${auth.user?.displayName || 'there'}! I'm Lilibet, your ${subject.name.toLowerCase()} tutor. What would you like to explore today?`,
      sender: 'tutor',
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages([welcomeMessage]);
    setCurrentConversationId(null);
    setHasUnsavedChanges(false);
  };

  // Resume conversation from history
  const resumeConversation = (conversation) => {
    setShowHistory(false);
    setCurrentSubject(conversation.subject);
    setMessages(JSON.parse(conversation.messages));
    setCurrentConversationId(conversation.id);
    setHasUnsavedChanges(false);
  };

  // Logout function
  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure? Any unsaved progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await auth.logout();
            setCurrentSubject('');
            setMessages([]);
          }
        }
      ]
    );
  };

  // Subject selection screen
  if (!currentSubject) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={24} color="#1f2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>Welcome back, {auth.user?.displayName}!</Text>
            <Text style={styles.headerTitle}>Choose Your Subject</Text>
          </View>
          <TouchableOpacity 
            style={styles.historyButton} 
            onPress={() => setShowHistory(true)}
          >
            <Ionicons name="time" size={24} color="#1f2937" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.subjectsContainer}>
          {subjects.map((subject) => (
            <TouchableOpacity
              key={subject.id}
              style={[styles.subjectButton, { backgroundColor: subject.color }]}
              onPress={() => selectSubject(subject.id)}
            >
              <Ionicons name={subject.icon} size={48} color="white" />
              <Text style={styles.subjectText}>{subject.name}</Text>
              <Text style={styles.subjectSubtext}>
                {subject.id === 'math' && 'Numbers, equations, problem solving'}
                {subject.id === 'reading' && 'Stories, comprehension, analysis'}
                {subject.id === 'writing' && 'Essays, creativity, expression'}
                {subject.id === 'science' && 'Experiments, discoveries, nature'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Conversation History Modal */}
        <Modal
          visible={showHistory}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <ConversationHistory
            onSelectConversation={resumeConversation}
            onClose={() => setShowHistory(false)}
          />
        </Modal>
      </SafeAreaView>
    );
  }

  // Chat interface
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.hamburgerButton} 
            onPress={() => setCurrentSubject('')}
          >
            <Ionicons name="arrow-back" size={20} color="#1f2937" />
          </TouchableOpacity>
          <View style={[styles.iconContainer, { backgroundColor: subjects.find(s => s.id === currentSubject)?.color }]}>
            <Ionicons 
              name={subjects.find(s => s.id === currentSubject)?.icon} 
              size={20} 
              color="white" 
            />
          </View>
          <View>
            <Text style={styles.headerTitle}>
              {subjects.find(s => s.id === currentSubject)?.name} with Lilibet
            </Text>
            <Text style={styles.headerSubtitle}>
              {auth.user?.displayName} • {hasUnsavedChanges ? 'Unsaved changes' : 'Saved'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Save Button */}
          {hasUnsavedChanges && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveConversation}
            >
              <Ionicons name="save" size={16} color="#3b82f6" />
            </TouchableOpacity>
          )}
          
          {/* Voice Toggle */}
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
              <Text style={styles.tutorText}>
                Lilibet is thinking...
              </Text>
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
          placeholder="Type your question..."
          onSubmitEditing={handleSubmit}
          returnKeyType="send"
        />
        
        <TouchableOpacity style={styles.sendButton} onPress={handleSubmit}>
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Main App with AuthProvider wrapper
export default function App() {
  return (
    <AuthProvider>
      <LilibetApp />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    alignItems: 'center',
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  historyButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  subjectsContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  subjectButton: {
    width: screenWidth - 80,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  subjectText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
  },
  subjectSubtext: {
    fontSize: 14,
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
    flex: 1,
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
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  saveButton: {
    padding: 8,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#eff6ff',
  },
  voiceButton: {
    padding: 8,
    borderRadius: 16,
  },
  voiceMuted: {
    backgroundColor: '#fee2e2',
  },
  voiceOn: {
    backgroundColor: '#dcfce7',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  messagesContent: {
    padding: 16,
  },
  messageRow: {
    marginVertical: 4,
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
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#3b82f6',
  },
  tutorBubble: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: 'white',
  },
  tutorText: {
    color: '#1f2937',
  },
  inputBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
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
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});