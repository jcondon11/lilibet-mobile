import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

// Platform-specific speech synthesis
export const speakMessage = async (text, options = {}) => {
  if (!text || !text.trim()) return;

  // Remove emojis from spoken text
  const cleanText = text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/gu, '').trim();
  
  if (!cleanText) return;

  if (Platform.OS === 'web') {
    // Web Speech API
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        console.warn('Speech synthesis not supported');
        resolve();
        return;
      }

      // Stop any current speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'en-GB';
      utterance.pitch = 1.1;
      utterance.rate = 1.2;
      utterance.volume = 0.8;

      utterance.onend = () => {
        if (options.onDone) options.onDone();
        resolve();
      };

      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        if (options.onError) options.onError();
        resolve(); // Don't reject, just resolve
      };

      window.speechSynthesis.speak(utterance);
    });
  } else {
    // Mobile - Expo Speech
    try {
      await Speech.speak(cleanText, {
        language: 'en-GB',
        pitch: 1.1,
        rate: 1.2,
        volume: 0.8,
        onDone: options.onDone,
        onStopped: options.onStopped,
        onError: options.onError,
      });
    } catch (error) {
      console.error('Mobile speech error:', error);
      if (options.onError) options.onError();
    }
  }
};

export const stopSpeaking = async () => {
  if (Platform.OS === 'web') {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } else {
    await Speech.stop();
  }
};