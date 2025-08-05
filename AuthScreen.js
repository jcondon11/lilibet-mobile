// AuthScreen.js - Fixed Version (No Blank Screen)
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';

export const AuthScreen = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [ageGroup, setAgeGroup] = useState('middle');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const ageGroups = [
    { id: 'elementary', name: 'Elementary (5-8)', icon: '🎈' },
    { id: 'elementary-middle', name: 'Upper Elementary (8-10)', icon: '📚' },
    { id: 'middle', name: 'Middle School (10-13)', icon: '🎯' },
    { id: 'high', name: 'High School (13+)', icon: '🎓' }
  ];

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!isLogin && !displayName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setIsLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(email.trim(), password);
      } else {
        result = await register(email.trim(), password, displayName.trim(), ageGroup);
      }

      if (!result.success) {
        Alert.alert(
          isLogin ? 'Login Failed' : 'Registration Failed',
          result.error || 'Something went wrong. Please try again.'
        );
      }
      // Success is handled by the auth context updating the app state
      
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
    setDisplayName('');
    setAgeGroup('middle');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>Lilibet</Text>
          <Text style={styles.tagline}>Your AI Learning Companion</Text>
        </View>

        {/* Auth Form */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>
            {isLogin ? 'Welcome Back!' : 'Create Your Account'}
          </Text>
          <Text style={styles.formSubtitle}>
            {isLogin ? 'Sign in to continue learning' : 'Join thousands of students learning with AI'}
          </Text>

          {/* Name field (register only) */}
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Your name"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                placeholderTextColor="#9ca3af"
              />
            </View>
          )}

          {/* Email field */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Password field */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color="#6b7280" 
              />
            </TouchableOpacity>
          </View>

          {/* Age group selector (register only) */}
          {!isLogin && (
            <View style={styles.ageGroupContainer}>
              <Text style={styles.ageGroupLabel}>What's your learning level?</Text>
              <View style={styles.ageGroupGrid}>
                {ageGroups.map((group) => (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.ageGroupButton,
                      ageGroup === group.id && styles.ageGroupSelected
                    ]}
                    onPress={() => setAgeGroup(group.id)}
                  >
                    <Text style={styles.ageGroupIcon}>{group.icon}</Text>
                    <Text style={[
                      styles.ageGroupText,
                      ageGroup === group.id && styles.ageGroupTextSelected
                    ]}>
                      {group.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading 
                ? (isLogin ? 'Signing In...' : 'Creating Account...') 
                : (isLogin ? 'Sign In' : 'Create Account')
              }
            </Text>
          </TouchableOpacity>

          {/* Toggle mode */}
          <TouchableOpacity style={styles.toggleButton} onPress={toggleMode}>
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.toggleLink}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            </Text>
          </TouchableOpacity>

          {/* Guest option */}
          <TouchableOpacity style={styles.guestButton}>
            <Text style={styles.guestText}>Continue as Guest</Text>
            <Text style={styles.guestSubtext}>
              Note: Your conversations won't be saved
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    width: '100%',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    height: 48,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    height: '100%',
  },
  passwordToggle: {
    padding: 8,
  },
  ageGroupContainer: {
    marginBottom: 24,
  },
  ageGroupLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  ageGroupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  ageGroupButton: {
    width: '48%',
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  ageGroupSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  ageGroupIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  ageGroupText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  ageGroupTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 14,
    color: '#6b7280',
  },
  toggleLink: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  guestButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  guestText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  guestSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
});