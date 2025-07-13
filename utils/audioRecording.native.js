import { Audio } from 'expo-av';

// Native audio recording using Expo Audio
export class NativeAudioRecording {
  constructor(recording) {
    this.recording = recording;
  }

  async stopAndUnloadAsync() {
    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
    }
  }

  getURI() {
    return this.recording ? this.recording.getURI() : null;
  }
}

export const createRecording = async () => {
  // Set up audio mode
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
    staysActiveInBackground: false,
  });

  // Create recording
  const { recording } = await Audio.Recording.createAsync({
    android: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
      audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 64000,
    },
    ios: {
      extension: '.m4a',
      outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
      audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 64000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    }
  });

  return { recording: new NativeAudioRecording(recording) };
};