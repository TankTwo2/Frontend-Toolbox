import React, { useState, useEffect } from 'react';
import { RecordingData } from '../../types';
import { Button } from '../../components';
import { VideoRecorderService } from './';
import { formatFileSize } from '../../utils/helpers';

interface VideoRecorderProps {
  isOpen: boolean;
  onClose: () => void;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ isOpen, onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<RecordingData[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingOptions, setRecordingOptions] = useState({
    audio: true,
    videoType: 'tab' as 'tab' | 'window' | 'screen'
  });

  useEffect(() => {
    if (isOpen) {
      loadRecordings();
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(VideoRecorderService.getRecordingDuration());
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording]);

  const loadRecordings = async () => {
    try {
      const storedRecordings = await VideoRecorderService.getStoredRecordings();
      setRecordings(storedRecordings);
    } catch (error) {
      console.error('Failed to load recordings:', error);
    }
  };

  const startRecording = async () => {
    try {
      await VideoRecorderService.startRecording(recordingOptions);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert((error as Error).message || '녹화를 시작할 수 없습니다.');
    }
  };

  const stopRecording = async () => {
    try {
      const newRecording = await VideoRecorderService.stopRecording();
      setIsRecording(false);
      setRecordingDuration(0);
      setRecordings(prev => [newRecording, ...prev]);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
    }
  };

  const downloadRecording = async (recording: RecordingData) => {
    try {
      await VideoRecorderService.downloadRecording(recording);
    } catch (error) {
      console.error('Failed to download recording:', error);
      alert('녹화 파일 다운로드에 실패했습니다.');
    }
  };

  const deleteRecording = async (id: string) => {
    if (confirm('이 녹화를 삭제하시겠습니까?')) {
      try {
        await VideoRecorderService.deleteRecording(id);
        setRecordings(prev => prev.filter(r => r.id !== id));
      } catch (error) {
        console.error('Failed to delete recording:', error);
        alert('녹화 파일 삭제에 실패했습니다.');
      }
    }
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-recorder">
        <div className="recording-controls">
          <div className="recording-options">
            <label>
              녹화 범위:
              <select
                value={recordingOptions.videoType}
                onChange={(e) => setRecordingOptions({
                  ...recordingOptions,
                  videoType: e.target.value as any
                })}
                disabled={isRecording}
              >
                <option value="tab">현재 탭</option>
                <option value="window">창 선택</option>
                <option value="screen">전체 화면</option>
              </select>
            </label>
            
            <label>
              <input
                type="checkbox"
                checked={recordingOptions.audio}
                onChange={(e) => setRecordingOptions({
                  ...recordingOptions,
                  audio: e.target.checked
                })}
                disabled={isRecording}
              />
              오디오 포함
            </label>
          </div>

          <div className="recording-actions">
            {!isRecording ? (
              <Button onClick={startRecording} variant="primary" size="large">
                🔴 녹화 시작
              </Button>
            ) : (
              <div className="recording-status">
                <Button onClick={stopRecording} variant="danger" size="large">
                  ⏹️ 녹화 중지
                </Button>
                <div className="recording-timer">
                  🔴 {formatDuration(recordingDuration)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="recordings-list">
          <h3>저장된 녹화 ({recordings.length})</h3>
          
          {recordings.length === 0 ? (
            <div className="no-recordings">
              저장된 녹화가 없습니다.
            </div>
          ) : (
            <div className="recordings-grid">
              {recordings.map((recording) => (
                <div key={recording.id} className="recording-item">
                  <div className="recording-info">
                    <div className="recording-name">{recording.name}</div>
                    <div className="recording-meta">
                      <span>{formatDuration(recording.duration)}</span>
                      <span>{formatFileSize(recording.size)}</span>
                      <span>{new Date(recording.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="recording-actions">
                    <Button
                      onClick={() => downloadRecording(recording)}
                      size="small"
                      variant="primary"
                    >
                      다운로드
                    </Button>
                    <Button
                      onClick={() => deleteRecording(recording.id)}
                      size="small"
                      variant="danger"
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="recording-guide">
          <h4>사용 방법</h4>
          <ul>
            <li>녹화 범위를 선택하고 녹화 시작 버튼을 클릭하세요</li>
            <li>창/화면 선택 시 추가 권한 요청이 있을 수 있습니다</li>
            <li>녹화된 파일은 WebM 형식으로 저장됩니다</li>
            <li>브라우저를 닫으면 저장된 녹화 목록이 초기화됩니다</li>
          </ul>
        </div>
    </div>
  );
};

export default VideoRecorder;