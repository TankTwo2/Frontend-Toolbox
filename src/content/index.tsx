import React from 'react';
import { createRoot } from 'react-dom/client';
import { ImageCollector } from '../features/imageDownloader';
import { StyleExtractor } from '../features/styleInspector';
import PanelManager from './PanelManager';
import './ContentScript.css';

// 메시지 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'ping':
      sendResponse({ pong: true });
      break;
      
    case 'collectImages':
      // 백그라운드 스크립트에서 이미지 수집 요청
      ImageCollector.collectImages().then(images => {
        sendResponse({ images });
      }).catch(error => {
        sendResponse({ error: error.message, images: [] });
      });
      return true; // Keep message channel open for async response

    case 'activateStyleInspector':
      // 백그라운드 스크립트에서 스타일 검사기 활성화 요청
      try {
        StyleExtractor.startInspecting();
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ error: (error as Error).message });
      }
      break;

    case 'deactivateStyleInspector':
      // 백그라운드 스크립트에서 스타일 검사기 비활성화 요청
      try {
        StyleExtractor.stopInspecting();
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ error: (error as Error).message });
      }
      break;

    case 'openImageDownloader':
    case 'openStyleInspector':  
    case 'openVideoRecorder':
      // 패널 매니저로 메시지 전달
      window.dispatchEvent(new CustomEvent('frontend-toolbox-message', { 
        detail: message 
      }));
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// 페이지 로드 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

function initializeContentScript() {
  console.log('Frontend Toolbox content script loaded');
  
  // 패널 매니저를 위한 컨테이너 생성
  const panelContainer = document.createElement('div');
  panelContainer.id = 'frontend-toolbox-panels';
  panelContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483647;
  `;
  document.body.appendChild(panelContainer);

  // React 루트 생성 및 마운트
  const root = createRoot(panelContainer);
  root.render(<PanelManager />);
}