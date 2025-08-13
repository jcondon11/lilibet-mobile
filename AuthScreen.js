// AuthContext.js - Fixed for Consistency with Backend
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fixed: Always use production URL
  const API_URL = 'https://lilibet-backend-production.up.railway.app';

  // Load stored auth data on app start
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.log('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fixed: Login to match backend expectations
  const login = async (emailOrUsername, password) => {
    try {
      console.log('🔐 AuthContext login attempt with:', emailOrUsername);
      
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          emailOrUsername: emailOrUsername.trim(),  // Backend expects this field
          password: password 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store auth data
      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  // Fixed: Register with correct parameters matching backend
  const register = async (email, password, displayName, ageGroup = 'middle', userType = 'student', username = null) => {
    try {
      console.log('📝 AuthContext registration attempt');
      
      const requestBody = {
        email: email.trim(),
        password,
        displayName: displayName || email.split('@')[0],
        ageGroup: userType === 'parent' ? 'adult' : ageGroup,
        userType,
        username: username ? username.trim() : null
      };
      
      console.log('📤 Sending registration:', requestBody);
      
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Auto-login after successful registration
      await AsyncStorage.setItem('authToken', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
      }
    } catch (error) {
      console.log('Logout endpoint error:', error);
    } finally {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
    }
  };

  // Get user conversations
  const getConversations = async (subject = null) => {
    try {
      const url = subject 
        ? `${API_URL}/api/conversations?subject=${subject}`
        : `${API_URL}/api/conversations`;
        
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get conversations');
      }

      return { success: true, conversations: data.conversations };
    } catch (error) {
      console.error('Get conversations error:', error);
      return { success: false, error: error.message };
    }
  };

  // Save conversation
  const saveConversation = async (subject, messages, title) => {
    try {
      const response = await fetch(`${API_URL}/api/conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subject, messages, title })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save conversation');
      }

      return { success: true, conversationId: data.conversationId };
    } catch (error) {
      console.error('Save conversation error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    getConversations,
    saveConversation,
    API_URL  // Export for use in other components
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };