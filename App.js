import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Modal,
  Dimensions,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './AuthContext';
import AuthScreen from './AuthScreen';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const API_URL = 'https://lilibet-backend-production.up.railway.app';

// Learning mode configurations
const LEARNING_MODES = {
  discovery: {
    name: 'Discovery',
    icon: '🔍',
    color: '#FF6B6B',
    description: 'Exploring new concepts'
  },
  practice: {
    name: 'Practice',
    icon: '✏️',
    color: '#4ECDC4',
    description: 'Building skills'
  },
  explanation: {
    name: 'Explanation',
    icon: '💡',
    color: '#FFD93D',
    description: 'Understanding why'
  },
  challenge: {
    name: 'Challenge',
    icon: '🎯',
    color: '#A8E6CF',
    description: 'Testing knowledge'
  },
  review: {
    name: 'Review',
    icon: '📚',
    color: '#C7CEEA',
    description: 'Reinforcing learning'
  }
};

// Subject configurations
const SUBJECTS = {
  Math: { emoji: '🔢', color: '#FF6B6B' },
  Science: { emoji: '🔬', color: '#4ECDC4' },
  Reading: { emoji: '📖', color: '#FFD93D' },
  Writing: { emoji: '✍️', color: '#A8E6CF' },
  General: { emoji: '🌟', color: '#C7CEEA' }
};

// Main Chat Interface Component
function ChatInterface() {
  const { user, token, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('General');
  const [currentLearningMode, setCurrentLearningMode] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [learningStreak, setLearningStreak] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef();

  useEffect(() => {
    // Entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Load user stats
    loadUserStats();
    
    // Welcome message
    setMessages([{
      role: 'assistant',
      content: `👋 Hi ${user?.username || 'there'}! I'm Lilibet, your learning companion. What would you like to explore today?`,
      timestamp: new Date().toISOString(),
      learningMode: 'discovery'
    }]);
  }, []);

  const loadUserStats = async () => {
    try {
      const streak = await AsyncStorage.getItem(`streak_${user?.id}`);
      const points = await AsyncStorage.getItem(`points_${user?.id}`);
      if (streak) setLearningStreak(parseInt(streak));
      if (points) setTotalPoints(parseInt(points));
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const sendMessage = async (text = inputText) => {
    if (!text.trim()) return;

    const userMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: text,
          subject: selectedSubject,
          conversationId: `${user?.id}_${Date.now()}`
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.learningMode) {
          setCurrentLearningMode(data.learningMode);
        }

        const aiMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
          learningMode: data.learningMode
        };
        
        setMessages(prev => [...prev, aiMessage]);
        updatePoints(10);
      } else {
        Alert.alert('Error', data.error || 'Failed to send message');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePoints = async (points) => {
    const newTotal = totalPoints + points;
    setTotalPoints(newTotal);
    await AsyncStorage.setItem(`points_${user?.id}`, String(newTotal));
  };

  const MessageBubble = ({ message }) => {
    const isUser = message.role === 'user';
    const mode = message.learningMode ? LEARNING_MODES[message.learningMode] : null;
    
    return (
      <Animated.View
        style={[
          styles.messageBubbleContainer,
          isUser ? styles.userBubbleContainer : styles.aiBubbleContainer,
          { opacity: fadeAnim }
        ]}
      >
        {!isUser && mode && (
          <View style={styles.learningModeTag}>
            <Text style={styles.learningModeIcon}>{mode.icon}</Text>
            <Text style={styles.learningModeText}>{mode.name}</Text>
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.aiMessageText
          ]}>
            {message.content}
          </Text>
          <Text style={styles.messageTime}>
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => setShowMenu(!showMenu)}
            style={styles.menuButton}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Lilibet</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>🔥</Text>
                <Text style={styles.statText}>{learningStreak}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>⭐</Text>
                <Text style={styles.statText}>{totalPoints}</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.parentButton}>
            <Text style={styles.parentIcon}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Current Learning Mode Display */}
        {currentLearningMode && (
          <View style={[styles.learningModeDisplay, { backgroundColor: LEARNING_MODES[currentLearningMode].color }]}>
            <Text style={styles.learningModeDisplayIcon}>
              {LEARNING_MODES[currentLearningMode].icon}
            </Text>
            <View>
              <Text style={styles.learningModeDisplayTitle}>
                {LEARNING_MODES[currentLearningMode].name} Mode
              </Text>
              <Text style={styles.learningModeDisplayDesc}>
                {LEARNING_MODES[currentLearningMode].description}
              </Text>
            </View>
          </View>
        )}

        {/* Subject Selector */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.subjectSelector}
        >
          {Object.keys(SUBJECTS).map(subject => (
            <TouchableOpacity
              key={subject}
              onPress={() => setSelectedSubject(subject)}
              style={[
                styles.subjectButton,
                selectedSubject === subject && { backgroundColor: SUBJECTS[subject].color }
              ]}
            >
              <Text style={styles.subjectEmoji}>
                {SUBJECTS[subject].emoji}
              </Text>
              <Text style={[
                styles.subjectText,
                selectedSubject === subject && styles.selectedSubjectText
              ]}>
                {subject}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Messages Area */}
        <View style={styles.messagesContainer}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScrollView}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
          >
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6C63FF" />
                <Text style={styles.loadingText}>Lilibet is thinking...</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Input Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inputContainer}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask me anything..."
              placeholderTextColor="#999"
              multiline
              maxHeight={100}
              onSubmitEditing={() => sendMessage()}
            />
            
            <TouchableOpacity
              onPress={() => sendMessage()}
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              disabled={!inputText.trim() || isLoading}
            >
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Simple Menu Modal */}
        {showMenu && (
          <Modal
            visible={showMenu}
            transparent
            animationType="slide"
            onRequestClose={() => setShowMenu(false)}
          >
            <TouchableOpacity 
              style={styles.menuOverlay}
              onPress={() => setShowMenu(false)}
            >
              <View style={styles.menuContent}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    Alert.alert('History', 'Conversation history coming soon!');
                  }}
                >
                  <Text style={styles.menuItemIcon}>📚</Text>
                  <Text style={styles.menuItemText}>Conversation History</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    Alert.alert('Dashboard', 'Parent dashboard coming soon!');
                  }}
                >
                  <Text style={styles.menuItemIcon}>📊</Text>
                  <Text style={styles.menuItemText}>Parent Dashboard</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    Alert.alert(
                      'Logout',
                      'Are you sure you want to logout?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Logout', 
                          onPress: () => {
                            setShowMenu(false);
                            logout();
                          },
                          style: 'destructive'
                        }
                      ]
                    );
                  }}
                >
                  <Text style={styles.menuItemIcon}>🚪</Text>
                  <Text style={[styles.menuItemText, { color: '#FF6B6B' }]}>
                    Logout
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </View>
    </SafeAreaView>
  );
}

// Main App Component
function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    AsyncStorage.getItem('token').then(token => {
      setIsReady(true);
    });
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { token } = useAuth();
  return token ? <ChatInterface /> : <AuthScreen />;
}

// Export the App component as default
export default App;

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667EEA',
  },
  gradient: {
    flex: 1,
    backgroundColor: '#667EEA',
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#667EEA',
  },
  menuButton: {
    padding: 5,
  },
  menuIcon: {
    fontSize: 28,
    color: 'white',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 15,
  },
  statIcon: {
    fontSize: 14,
  },
  statText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  parentButton: {
    padding: 5,
  },
  parentIcon: {
    fontSize: 28,
    color: 'white',
  },
  learningModeDisplay: {
    marginHorizontal: 20,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 15,
    gap: 10,
  },
  learningModeDisplayIcon: {
    fontSize: 24,
  },
  learningModeDisplayTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  learningModeDisplayDesc: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
  },
  subjectSelector: {
    maxHeight: 80,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  subjectButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 90,
    marginHorizontal: 5,
    backgroundColor: 'white',
  },
  subjectEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  selectedSubjectText: {
    color: 'white',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 10,
  },
  messagesScrollView: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 10,
  },
  messageBubbleContainer: {
    marginBottom: 15,
  },
  userBubbleContainer: {
    alignItems: 'flex-end',
  },
  aiBubbleContainer: {
    alignItems: 'flex-start',
  },
  learningModeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  learningModeIcon: {
    fontSize: 12,
    marginRight: 5,
  },
  learningModeText: {
    fontSize: 10,
    color: '#6C63FF',
    fontWeight: '600',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#6C63FF',
    borderTopRightRadius: 5,
  },
  aiBubble: {
    backgroundColor: 'white',
    borderTopLeftRadius: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: 'white',
  },
  aiMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 5,
    opacity: 0.7,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#6C63FF',
    fontSize: 14,
  },
  inputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#F8F9FA',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D0D0D0',
  },
  sendIcon: {
    color: 'white',
    fontSize: 20,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 15,
  },
  menuItemIcon: {
    fontSize: 24,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
});