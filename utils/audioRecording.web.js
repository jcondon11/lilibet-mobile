// Web audio recording using MediaRecorder API
export class WebAudioRecording {
  constructor() {
    this.mediaRecorder = null;
    this.stream = null;
    this.chunks = [];
    this.isRecording = false;
  }

  async startRecording() {
    try {
      console.log('WebAudioRecording: Starting...');
      
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      console.log('WebAudioRecording: Got media stream');
      
      this.chunks = [];
      
      // Try different MIME types for better browser compatibility
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Let browser choose
          }
        }
      }
      
      console.log('WebAudioRecording: Using MIME type:', mimeType);
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: mimeType
      });

      this.mediaRecorder.ondataavailable = (event) => {
        console.log('WebAudioRecording: Data available, size:', event.data.size);
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstart = () => {
        console.log('WebAudioRecording: Recording started');
        this.isRecording = true;
      };

      this.mediaRecorder.onstop = () => {
        console.log('WebAudioRecording: Recording stopped');
        this.isRecording = false;
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('WebAudioRecording: Error:', event.error);
      };

      this.mediaRecorder.start(1000); // Collect data every second
      console.log('WebAudioRecording: MediaRecorder started');
      
      return { recording: this };
    } catch (error) {
      console.error('WebAudioRecording: Error in startRecording:', error);
      throw error;
    }
  }

  async stopAndUnloadAsync() {
    return new Promise((resolve) => {
      console.log('WebAudioRecording: stopAndUnloadAsync called');
      
      if (!this.mediaRecorder) {
        console.log('WebAudioRecording: No mediaRecorder, resolving immediately');
        resolve();
        return;
      }

      if (this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.onstop = () => {
          console.log('WebAudioRecording: Stopped, cleaning up');
          if (this.stream) {
            this.stream.getTracks().forEach(track => {
              console.log('WebAudioRecording: Stopping track:', track.kind);
              track.stop();
            });
          }
          resolve();
        };

        console.log('WebAudioRecording: Stopping recording...');
        this.mediaRecorder.stop();
      } else {
        console.log('WebAudioRecording: Already stopped, cleaning up');
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }
        resolve();
      }
    });
  }

  getURI() {
    console.log('WebAudioRecording: getURI called, chunks:', this.chunks.length);
    if (this.chunks.length === 0) {
      console.log('WebAudioRecording: No chunks available');
      return null;
    }
    
    const blob = new Blob(this.chunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    console.log('WebAudioRecording: Created blob URL:', url);
    return url;
  }

  // Convert to File object for upload
  getFile() {
    console.log('WebAudioRecording: getFile called, chunks:', this.chunks.length);
    if (this.chunks.length === 0) {
      console.log('WebAudioRecording: No chunks available for file');
      return null;
    }
    
    const blob = new Blob(this.chunks, { type: 'audio/webm' });
    const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
    console.log('WebAudioRecording: Created file:', file.name, 'size:', file.size);
    return file;
  }
}

export const createRecording = async () => {
  console.log('WebAudioRecording: createRecording called');
  const recorder = new WebAudioRecording();
  return await recorder.startRecording();
};