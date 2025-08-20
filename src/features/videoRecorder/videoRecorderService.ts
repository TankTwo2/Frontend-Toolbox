import { RecordingData } from '../../types';
import { generateUniqueId } from '../../utils/helpers';

class VideoRecorder {
  private static mediaRecorder: MediaRecorder | null = null;
  private static stream: MediaStream | null = null;
  private static recordedChunks: Blob[] = [];
  private static startTime: number = 0;

  static async startRecording(options: {
    audio: boolean;
    videoType: 'tab' | 'window' | 'screen';
  }): Promise<void> {
    try {
      // Request permission and get stream
      this.stream = await this.getMediaStream(options);
      
      if (!this.stream) {
        throw new Error('Failed to get media stream');
      }

      // Initialize MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      this.recordedChunks = [];
      this.startTime = Date.now();

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        await this.handleRecordingComplete();
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second

    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  static async stopRecording(): Promise<RecordingData> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const recordingData = await this.handleRecordingComplete();
          resolve(recordingData);
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
      
      // Stop all tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
    });
  }

  private static async getMediaStream(options: {
    audio: boolean;
    videoType: 'tab' | 'window' | 'screen';
  }): Promise<MediaStream> {
    try {
      // 모든 경우에 getDisplayMedia API 사용 (표준 API)
      const constraints: DisplayMediaStreamConstraints = {
        video: {
          mediaSource: options.videoType === 'tab' ? 'browser' : 'screen'
        } as any,
        audio: options.audio
      };

      return await navigator.mediaDevices.getDisplayMedia(constraints);
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        throw new Error('화면 공유 권한이 거부되었습니다. 브라우저 설정에서 권한을 확인해주세요.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('화면 공유를 위한 미디어 장치를 찾을 수 없습니다.');
      } else {
        throw new Error(`화면 공유 시작 실패: ${error.message}`);
      }
    }
  }

  private static async handleRecordingComplete(): Promise<RecordingData> {
    const duration = Date.now() - this.startTime;
    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    
    const recordingData: RecordingData = {
      id: generateUniqueId(),
      name: `Recording_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`,
      duration,
      size: blob.size,
      blob,
      createdAt: new Date()
    };

    // Save to storage
    const recordings = await this.getStoredRecordings();
    recordings.push(recordingData);
    await this.saveRecordings(recordings);

    return recordingData;
  }

  static async downloadRecording(recording: RecordingData): Promise<void> {
    const url = URL.createObjectURL(recording.blob);
    const filename = `${recording.name}.webm`;

    if (chrome?.downloads) {
      chrome.downloads.download({
        url: url,
        filename: filename
      });
    } else {
      // Fallback
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  static async deleteRecording(id: string): Promise<void> {
    const recordings = await this.getStoredRecordings();
    const filteredRecordings = recordings.filter(r => r.id !== id);
    await this.saveRecordings(filteredRecordings);
  }

  static async getStoredRecordings(): Promise<RecordingData[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get('recordings', (result) => {
        resolve(result.recordings || []);
      });
    });
  }

  private static async saveRecordings(recordings: RecordingData[]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ recordings }, () => {
        resolve();
      });
    });
  }

  static isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  static getRecordingDuration(): number {
    if (!this.isRecording()) return 0;
    return Date.now() - this.startTime;
  }
}

export default VideoRecorder;