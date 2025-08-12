import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Animated
} from 'react-native';
import { useAuth } from './AuthContext';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [accountType, setAccountType] = useState('student');
  const [parentEmail, setParentEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  
  const { login, register } = useAuth();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogin = async () => {
    if (!loginId || !password) {
      Alert.alert('Error', 'Please enter your email/username and password');
      return;
    }

    setIsLoading(true);
    const result = await login(loginId, password);
    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Login Failed', result.error || 'Invalid credentials');
    }
  };

  const handleRegister = async () => {
    // Validation
    if (!email || !password) {
      Alert.alert('Error', 'Email and password are required');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (!ageGroup && accountType === 'student') {
      Alert.alert('Error', 'Please select an age group');
      return;
    }

    setIsLoading(true);
    const result = await register(
      email,
      username || null,
      password,
      displayName || username || email.split('@')[0],
      ageGroup,
      accountType,
      parentEmail || null
    );
    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Registration Failed', result.error);
    } else {
      Alert.alert(
        'Success!', 
        `Account created! ${username ? `You can login with "${username}" or "${email}"` : `Login with "${email}"`}`,
        [{ text: 'OK', onPress: () => setIsLogin(true) }]
      );
    }
  };

  const checkUsernameAvailability = async (text) => {
    setUsername(text);
    
    if (text.length >= 3 && /^[a-zA-Z0-9_]+$/.test(text)) {
      try {
        const response = await fetch(`${API_URL}/api/auth/check-username/${text}`);
        const data = await response.json();
        setUsernameAvailable(data.available);
      } catch (error) {
        console.error('Username check error:', error);
      }
    } else {
      setUsernameAvailable(null);
    }
  };

  const AgeGroupButton = ({ group, emoji }) => (
    <TouchableOpacity
      style={[
        styles.ageButton,
        ageGroup === group && styles.ageButtonSelected
      ]}
      onPress={() => setAgeGroup(group)}
    >
      <Text style={styles.ageEmoji}>{emoji}</Text>
      <Text style={[
        styles.ageText,
        ageGroup === group && styles.ageTextSelected
      ]}>
        {group}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.logo}>🎓</Text>
              <Text style={styles.title}>Lilibet</Text>
              <Text style={styles.subtitle}>Your AI Learning Companion</Text>
            </View>

            {/* Form Container */}
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>
                {isLogin ? 'Welcome Back!' : 'Create Account'}
              </Text>

              {isLogin ? (
                // Login Form
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email or Username</Text>
                    <TextInput
                      style={styles.input}
                      value={loginId}
                      onChangeText={setLoginId}
                      placeholder="Enter email or username"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Text style={styles.hint}>
                      💡 You can login with either your email or username
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={[styles.input, styles.passwordInput]}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Enter password"
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Text>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              ) : (
                // Registration Form
                <>
                  {/* Account Type Selector */}
                  <View style={styles.accountTypeContainer}>
                    <TouchableOpacity
                      style={[
                        styles.accountTypeButton,
                        accountType === 'student' && styles.accountTypeSelected
                      ]}
                      onPress={() => setAccountType('student')}
                    >
                      <Text style={styles.accountTypeEmoji}>🎓</Text>
                      <Text style={[
                        styles.accountTypeText,
                        accountType === 'student' && styles.accountTypeTextSelected
                      ]}>
                        Student
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.accountTypeButton,
                        accountType === 'parent' && styles.accountTypeSelected
                      ]}
                      onPress={() => setAccountType('parent')}
                    >
                      <Text style={styles.accountTypeEmoji}>👨‍👩‍👧‍👦</Text>
                      <Text style={[
                        styles.accountTypeText,
                        accountType === 'parent' && styles.accountTypeTextSelected
                      ]}>
                        Parent
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email *</Text>
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder={accountType === 'parent' ? 'parent@email.com' : 'student@email.com'}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Username (Optional) {usernameAvailable === true && '✅'} 
                      {usernameAvailable === false && '❌'}
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        usernameAvailable === true && styles.inputSuccess,
                        usernameAvailable === false && styles.inputError
                      ]}
                      value={username}
                      onChangeText={checkUsernameAvailability}
                      placeholder="Choose a fun username (3-20 characters)"
                      autoCapitalize="none"
                      maxLength={20}
                    />
                    {username.length > 0 && (
                      <Text style={[
                        styles.hint,
                        usernameAvailable === false && styles.hintError
                      ]}>
                        {usernameAvailable === true && '✅ Username available!'}
                        {usernameAvailable === false && '❌ Username taken, try another'}
                        {usernameAvailable === null && username.length < 3 && 'Username must be at least 3 characters'}
                        {usernameAvailable === null && !/^[a-zA-Z0-9_]+$/.test(username) && 'Only letters, numbers, and underscores allowed'}
                      </Text>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Display Name</Text>
                    <TextInput
                      style={styles.input}
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder={accountType === 'parent' ? 'Mom/Dad' : 'What should I call you?'}
                    />
                  </View>

                  {accountType === 'student' && (
                    <>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Parent's Email (Optional)</Text>
                        <TextInput
                          style={styles.input}
                          value={parentEmail}
                          onChangeText={setParentEmail}
                          placeholder="parent@email.com"
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                        <Text style={styles.hint}>
                          Link to parent account for monitoring
                        </Text>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Age Group *</Text>
                        <View style={styles.ageGroupGrid}>
                          <AgeGroupButton group="Elementary" emoji="🧒" />
                          <AgeGroupButton group="Middle School" emoji="👦" />
                          <AgeGroupButton group="High School" emoji="👨‍🎓" />
                          <AgeGroupButton group="Adult" emoji="👨‍💼" />
                        </View>
                      </View>
                    </>
                  )}

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password *</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={[styles.input, styles.passwordInput]}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="At least 6 characters"
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Text>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirm Password *</Text>
                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Enter password again"
                      secureTextEntry={!showPassword}
                    />
                  </View>
                </>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={isLogin ? handleLogin : handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitText}>
                    {isLogin ? 'Login' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Toggle Form */}
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => {
                  setIsLogin(!isLogin);
                  // Reset form
                  setLoginId('');
                  setEmail('');
                  setUsername('');
                  setPassword('');
                  setConfirmPassword('');
                  setDisplayName('');
                  setAgeGroup('');
                  setParentEmail('');
                }}
              >
                <Text style={styles.toggleText}>
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  <Text style={styles.toggleLink}>
                    {isLogin ? 'Sign Up' : 'Login'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#6C63FF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
  },
  inputSuccess: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  inputError: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 5,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  hintError: {
    color: '#F44336',
  },
  accountTypeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  accountTypeButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  accountTypeSelected: {
    borderColor: '#6C63FF',
    backgroundColor: '#F0EFFF',
  },
  accountTypeEmoji: {
    fontSize: 28,
    marginBottom: 5,
  },
  accountTypeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  accountTypeTextSelected: {
    color: '#6C63FF',
  },
  ageGroupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ageButton: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
  },
  ageButtonSelected: {
    borderColor: '#6C63FF',
    backgroundColor: '#F0EFFF',
  },
  ageEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  ageText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  ageTextSelected: {
    color: '#6C63FF',
  },
  submitButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  toggleButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    color: '#666',
  },
  toggleLink: {
    color: '#6C63FF',
    fontWeight: 'bold',
  },
});