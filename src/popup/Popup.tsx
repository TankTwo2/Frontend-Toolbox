import React, { useState, useEffect } from 'react';
import './Popup.css';
import { ImageDownloader } from '../features/imageDownloader';
import { StyleInspector } from '../features/styleInspector';
import { VideoRecorder } from '../features/videoRecorder';
import { Button } from '../components';

const Popup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<chrome.tabs.Tab | null>(null);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      setActiveTab(tabs[0]);
    });
  }, []);

  const openFeature = (featureName: string) => {
    setActiveFeature(featureName);
  };

  const closeFeature = () => {
    setActiveFeature(null);
  };

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>Frontend Toolbox</h1>
        <p>프론트엔드 개발을 위한 도구 모음</p>
      </header>
      
      <main className="popup-main">
        <div className="current-tab">
          <h3>현재 탭</h3>
          <p>{activeTab?.title || 'Loading...'}</p>
          <small>{activeTab?.url || ''}</small>
        </div>

        <div className="tools-section">
          <h3>도구</h3>
          
          <div className="tool-grid">
            <div className="tool-item">
              <div className="tool-icon">🖼️</div>
              <div className="tool-info">
                <h4>이미지 다운로더</h4>
                <p>페이지의 모든 이미지를 수집하고 다운로드</p>
              </div>
              <Button
                onClick={() => openFeature('imageDownloader')}
                size="small"
                variant="primary"
              >
                열기
              </Button>
            </div>

            <div className="tool-item">
              <div className="tool-icon">🎨</div>
              <div className="tool-info">
                <h4>스타일 검사기</h4>
                <p>요소의 CSS와 Tailwind 클래스 추출</p>
              </div>
              <Button
                onClick={() => openFeature('styleInspector')}
                size="small"
                variant="primary"
              >
                열기
              </Button>
            </div>

            <div className="tool-item">
              <div className="tool-icon">📹</div>
              <div className="tool-info">
                <h4>비디오 녹화기</h4>
                <p>화면 녹화 및 스트리밍 저장</p>
              </div>
              <Button
                onClick={() => openFeature('videoRecorder')}
                size="small"
                variant="primary"
              >
                열기
              </Button>
            </div>
          </div>
        </div>

        <div className="info-section">
          <small>
            💡 각 도구를 클릭하여 기능을 사용하세요
          </small>
        </div>
      </main>

      {/* Feature Modals */}
      <ImageDownloader
        isOpen={activeFeature === 'imageDownloader'}
        onClose={closeFeature}
      />
      
      <StyleInspector
        isOpen={activeFeature === 'styleInspector'}
        onClose={closeFeature}
      />
      
      <VideoRecorder
        isOpen={activeFeature === 'videoRecorder'}
        onClose={closeFeature}
      />
    </div>
  );
};

export default Popup;