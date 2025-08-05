// AuthContext.js - Complete File
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

  // Get server URL (same logic as your App.js)
  const getServerUrl = () => {
    if (__DEV__) {
      return Platform.OS === 'web' ? 'http://localhost:3001' : 'http://192.168.86.58:3001';
    } else {
      return 'https://lilibet-backend-production.up.railway.app';
    }
  };

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

  const login = async (email, password) => {
    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
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

  const register = async (email, password, displayName, ageGroup) => {
    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          displayName, 
          ageGroup 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store auth data
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
      // Call logout endpoint if we have a token
      if (token) {
        const serverUrl = getServerUrl();
        await fetch(`${serverUrl}/api/auth/logout`, {
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
      // Clear local storage regardless
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
    }
  };

  const saveConversation = async (subject, messages, detectedLevel, modelUsed, title) => {
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          messages,
          detectedLevel,
          modelUsed,
          title
        })
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

  const getConversations = async (subject = null) => {
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const serverUrl = getServerUrl();
      const url = subject 
        ? `${serverUrl}/api/conversations?subject=${subject}`
        : `${serverUrl}/api/conversations`;
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch conversations');
      }

      return { success: true, conversations: data.conversations };
    } catch (error) {
      console.error('Get conversations error:', error);
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
    saveConversation,
    getConversations
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};