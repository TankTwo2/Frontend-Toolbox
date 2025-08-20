import React, { useState, useEffect } from 'react';
import { RecordingData } from '../../types';
import { Button } from '../../components';
import { VideoRecorderService } from './';
import { formatFileSize } from '../../utils/helpers';
import AreaSelector from './AreaSelector';

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
    videoType: 'tab' as 'tab' | 'screen' | 'area',
    fps: 30 as 15 | 30 | 60
  });
  const [isAreaSelectorVisible, setIsAreaSelectorVisible] = useState(false);
  const [selectedArea, setSelectedArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [downloadStates, setDownloadStates] = useState<Record<string, 'idle' | 'downloading' | 'downloaded' | 'failed'>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    if (recordingOptions.videoType === 'area') {
      setIsAreaSelectorVisible(true);
      return;
    }

    try {
      const options = selectedArea && recordingOptions.videoType === 'area' 
        ? { ...recordingOptions, area: selectedArea }
        : recordingOptions;
      await VideoRecorderService.startRecording(options);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert((error as Error).message || '녹화를 시작할 수 없습니다.');
    }
  };

  const getRecommendedFPS = (area: { x: number; y: number; width: number; height: number }) => {
    const areaSize = area.width * area.height;
    const screenSize = window.screen.width * window.screen.height;
    const areaRatio = areaSize / screenSize;

    // 작은 영역 (< 25%): 60fps
    if (areaRatio < 0.25) return 60;
    // 중간 영역 (25-75%): 30fps  
    if (areaRatio < 0.75) return 30;
    // 큰 영역 (> 75%): 15fps
    return 15;
  };

  const handleAreaSelected = async (area: { x: number; y: number; width: number; height: number }) => {
    setSelectedArea(area);
    setIsAreaSelectorVisible(false);
    
    // 스마트 FPS 추천
    const recommendedFPS = getRecommendedFPS(area);
    const shouldAutoAdjust = area.width * area.height > 1000000; // 1M 픽셀 이상

    if (shouldAutoAdjust && recordingOptions.fps > recommendedFPS) {
      const userConfirmed = confirm(
        `선택한 영역이 큽니다. 성능을 위해 ${recommendedFPS}fps로 자동 조정하시겠습니까?\n현재 설정: ${recordingOptions.fps}fps`
      );
      
      if (userConfirmed) {
        setRecordingOptions(prev => ({ ...prev, fps: recommendedFPS as 15 | 30 | 60 }));
      }
    }
    
    try {
      await VideoRecorderService.startRecording({ ...recordingOptions, area });
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert((error as Error).message || '녹화를 시작할 수 없습니다.');
    }
  };

  const handleAreaCancel = () => {
    setIsAreaSelectorVisible(false);
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
      // Set downloading state
      setDownloadStates(prev => ({ ...prev, [recording.id]: 'downloading' }));
      
      await VideoRecorderService.downloadRecording(recording);
      
      // Set downloaded state (permanent until session ends)
      setDownloadStates(prev => ({ ...prev, [recording.id]: 'downloaded' }));
      
      // Show toast message
      setToastMessage(`${recording.name}.webm 다운로드 완료`);
      setTimeout(() => setToastMessage(null), 4000);
      
    } catch (error) {
      console.error('Failed to download recording:', error);
      
      // Set failed state
      setDownloadStates(prev => ({ ...prev, [recording.id]: 'failed' }));
      
      // Reset failed state to idle after 3 seconds
      setTimeout(() => {
        setDownloadStates(prev => ({ ...prev, [recording.id]: 'idle' }));
      }, 3000);
      
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
    <>
      <AreaSelector
        isVisible={isAreaSelectorVisible}
        onAreaSelected={handleAreaSelected}
        onCancel={handleAreaCancel}
      />
      {toastMessage && (
        <div className="download-toast">
          ✅ {toastMessage}
        </div>
      )}
      <div className="video-recorder">
        <div className="video-recorder-fixed-header">
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
                <option value="screen">전체 화면</option>
                <option value="area">화면 지정</option>
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

            <label>
              프레임 레이트:
              <select
                value={recordingOptions.fps}
                onChange={(e) => setRecordingOptions({
                  ...recordingOptions,
                  fps: parseInt(e.target.value) as 15 | 30 | 60
                })}
                disabled={isRecording}
              >
                <option value={15}>15fps (절약)</option>
                <option value={30}>30fps (기본)</option>
                <option value={60}>60fps (고품질)</option>
              </select>
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

        <div className="video-content-scrollable">
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
                        variant={downloadStates[recording.id] === 'downloaded' ? 'secondary' : downloadStates[recording.id] === 'failed' ? 'danger' : 'primary'}
                        disabled={downloadStates[recording.id] === 'downloading'}
                      >
                        {downloadStates[recording.id] === 'downloading' && '⏳ 다운로드 중...'}
                        {downloadStates[recording.id] === 'downloaded' && '✅ 다운받음'}
                        {downloadStates[recording.id] === 'failed' && '❌ 실패'}
                        {(!downloadStates[recording.id] || downloadStates[recording.id] === 'idle') && '다운로드'}
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
              <li>화면 지정 모드에서는 마우스로 드래그하여 영역을 선택합니다</li>
              <li>큰 영역 선택 시 자동으로 최적 FPS가 추천됩니다</li>
              <li>창/화면 선택 시 추가 권한 요청이 있을 수 있습니다</li>
              <li>녹화된 파일은 WebM 형식으로 저장됩니다</li>
              <li>브라우저를 닫으면 저장된 녹화 목록이 초기화됩니다</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default VideoRecorder;