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
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://lilibet-backend-production.up.railway.app';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [userType, setUserType] = useState('student');
  const [ageGroup, setAgeGroup] = useState('middle');
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('General');
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef();

  const subjects = ['Math', 'Science', 'Reading', 'Writing', 'History', 'General'];
  const ageGroups = [
    { id: 'elementary', name: 'Elementary (5-8)', icon: '🎈' },
    { id: 'middle', name: 'Middle School (10-13)', icon: '🎯' },
    { id: 'high', name: 'High School (13+)', icon: '🎓' }
  ];

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('authToken');
      const savedUser = await AsyncStorage.getItem('user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setIsLoggedIn(true);
        initializeChat(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeChat = (userData) => {
    const name = userData?.displayName || userData?.email?.split('@')[0] || 'there';
    setMessages([{
      role: 'assistant',
      content: `Hi ${name}! I'm Lilibet, your learning companion. What would you like to explore today?`,
      timestamp: new Date().toISOString()
    }]);
  };

  const handleRegister = async () => {
    console.log('📝 Registration attempt started');
    
    if (!email.trim() || !password || !displayName.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      // Consistent with backend expectations
      const requestBody = {
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        userType,  // Added userType
        ageGroup: userType === 'parent' ? 'adult' : ageGroup,
        username: null  // Optional username field
      };
      
      console.log('📤 Sending registration request:', requestBody);

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Registration successful!');
        // Clear form and switch to login
        setPassword('');
        setDisplayName('');
        setShowLogin(true);
        Alert.alert('Success!', 'Account created! Please login.');
      } else {
        console.log('❌ Registration failed:', data);
        Alert.alert('Registration Failed', data.error || 'Please try again');
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    console.log('🔐 Login attempt started');
    console.log('📧 Email/Username:', email);
    
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter email/username and password');
      return;
    }

    setIsLoading(true);
    try {
      // CONSISTENT: Use emailOrUsername field
      const requestBody = {
        emailOrUsername: email.trim(),  // Backend expects this field name
        password: password
      };
      
      console.log('📤 Sending login request');

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status);
      
      const responseText = await response.text();
      console.log('📥 Raw response length:', responseText.length);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        Alert.alert('Server Error', 'Invalid server response');
        setIsLoading(false);
        return;
      }
      
      if (response.ok) {
        console.log('✅ Login successful!');
        await AsyncStorage.setItem('authToken', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setIsLoggedIn(true);
        initializeChat(data.user);
        // Clear password for security
        setPassword('');
      } else {
        console.log('❌ Login failed:', data.error);
        Alert.alert('Login Failed', data.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isSending) return;

    const userMessage = {
      role: 'user',
      content: inputText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsSending(true);

    try {
      const response = await fetch(`${API_URL}/api/tutor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage.content,
          subject: selectedSubject,
          ageGroup: user?.ageGroup || 'middle'  // Include user's age group
        })
      });

      const data = await response.json();

      if (response.ok) {
        const aiMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        Alert.alert('Error', data.error || 'Failed to send message');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error.');
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
    setMessages([]);
    setEmail('');
    setPassword('');
    setDisplayName('');
    setShowLogin(true);  // Reset to login screen
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authContainer}>
          <Text style={styles.appTitle}>Lilibet</Text>
          <Text style={styles.appSubtitle}>Your AI Learning Companion</Text>

          <View style={styles.authForm}>
            <Text style={styles.authTitle}>
              {showLogin ? 'Welcome Back!' : 'Create Account'}
            </Text>

            {/* User Type Selector (Registration Only) */}
            {!showLogin && (
              <View style={styles.userTypeContainer}>
                <Text style={styles.label}>Account Type:</Text>
                <View style={styles.userTypeRow}>
                  <TouchableOpacity
                    style={[styles.userTypeButton, userType === 'student' && styles.userTypeActive]}
                    onPress={() => setUserType('student')}
                  >
                    <Text style={styles.userTypeText}>🎓 Student</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.userTypeButton, userType === 'parent' && styles.userTypeActive]}
                    onPress={() => setUserType('parent')}
                  >
                    <Text style={styles.userTypeText}>👨‍👩‍👧‍👦 Parent</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Name Field (Registration Only) */}
            {!showLogin && (
              <View>
                <Text style={styles.label}>Your Name:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor="#999"
                  value={displayName}
                  onChangeText={setDisplayName}
                />
              </View>
            )}

            {/* Email/Username Field */}
            <View>
              <Text style={styles.label}>
                {showLogin ? 'Email or Username:' : 'Email:'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={showLogin ? "Enter email or username" : "Enter your email"}
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Password Field */}
            <View>
              <Text style={styles.label}>Password:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {/* Age Group (Student Registration Only) */}
            {!showLogin && userType === 'student' && (
              <View>
                <Text style={styles.label}>Learning Level:</Text>
                {ageGroups.map((group) => (
                  <TouchableOpacity
                    key={group.id}
                    style={[styles.ageGroupButton, ageGroup === group.id && styles.ageGroupActive]}
                    onPress={() => setAgeGroup(group.id)}
                  >
                    <Text style={styles.ageGroupText}>{group.icon} {group.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={showLogin ? handleLogin : handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Loading...' : (showLogin ? 'Sign In' : 'Create Account')}
              </Text>
            </TouchableOpacity>

            {/* Toggle Mode */}
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => {
                setShowLogin(!showLogin);
                // Clear form when switching
                setEmail('');
                setPassword('');
                setDisplayName('');
              }}
            >
              <Text style={styles.toggleText}>
                {showLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
              </Text>
            </TouchableOpacity>

            {/* TEST: Quick Fill Button (for development) */}
            <TouchableOpacity
              style={styles.testButton}
              onPress={() => {
                if (showLogin) {
                  // For login testing
                  setEmail('test@example.com');
                  setPassword('password123');
                } else {
                  // For registration testing
                  const randomNum = Math.floor(Math.random() * 1000);
                  setEmail(`test${randomNum}@example.com`);
                  setPassword('password123');
                  setDisplayName(`Test User ${randomNum}`);
                }
                console.log('🧪 Filled test credentials');
              }}
            >
              <Text style={styles.testButtonText}>
                🧪 {showLogin ? 'Fill Test Login' : 'Generate Test Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Main Chat Interface (when logged in)
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lilibet</Text>
        <View style={styles.headerRight}>
          <Text style={styles.welcomeText}>Hi {user?.displayName || 'Student'}!</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Subject Selector */}
      <View style={styles.subjectContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {subjects.map(subject => (
            <TouchableOpacity
              key={subject}
              style={[styles.subjectButton, selectedSubject === subject && styles.subjectActive]}
              onPress={() => setSelectedSubject(subject)}
            >
              <Text style={[styles.subjectText, selectedSubject === subject && styles.subjectTextActive]}>
                {subject}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef} 
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message, index) => (
          <View key={index} style={[
            styles.message,
            message.role === 'user' ? styles.userMessage : styles.assistantMessage
          ]}>
            <Text style={[
              styles.messageText,
              message.role === 'user' ? styles.userMessageText : styles.assistantMessageText
            ]}>
              {message.content}
            </Text>
          </View>
        ))}
        {isSending && (
          <View style={styles.loadingMessage}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingMessageText}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.chatInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask me anything..."
          placeholderTextColor="#999"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isSending}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#000000',
  },
  
  // Auth Styles
  authContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 40,
  },
  authForm: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  authTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  userTypeContainer: {
    marginBottom: 16,
  },
  userTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userTypeButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  userTypeActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E6F3FF',
  },
  userTypeText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  ageGroupButton: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    backgroundColor: '#FFFFFF',
  },
  ageGroupActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E6F3FF',
  },
  ageGroupText: {
    fontSize: 14,
    color: '#000000',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleText: {
    fontSize: 14,
    color: '#007AFF',
  },
  testButton: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Chat Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: '#000000',
    marginRight: 12,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF3B30',
    borderRadius: 6,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  subjectContainer: {
    backgroundColor: '#F8F8F8',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  subjectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  subjectActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  subjectText: {
    color: '#000000',
    fontSize: 14,
  },
  subjectTextActive: {
    color: '#FFFFFF',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  message: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messageText: {
    fontSize: 16,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: '#000000',
  },
  loadingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    marginBottom: 8,
  },
  loadingMessageText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#000000',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'flex-end',
  },
  chatInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});