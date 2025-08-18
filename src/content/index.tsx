import { ImageCollector } from '../features/imageDownloader';
import { StyleExtractor } from '../features/styleInspector';

// 메시지 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'ping':
      sendResponse({ pong: true });
      break;
      
    case 'getImages':
      ImageCollector.collectImages().then(images => {
        sendResponse({ images });
      }).catch(error => {
        sendResponse({ error: error.message });
      });
      return true; // Keep message channel open for async response

    case 'downloadImage':
      ImageCollector.downloadImage(message.data.image)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'downloadImages':
      ImageCollector.downloadImages(message.data.images)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'startStyleInspector':
      try {
        StyleExtractor.startInspecting();
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ error: (error as Error).message });
      }
      break;

    case 'stopStyleInspector':
      try {
        StyleExtractor.stopInspecting();
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ error: (error as Error).message });
      }
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
}