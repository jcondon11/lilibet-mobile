import { Platform } from 'react-native';

// Platform-specific audio recording
export const AudioRecording = Platform.select({
  web: require('./audioRecording.web.js'),
  default: require('./audioRecording.native.js')
});

export default AudioRecording;