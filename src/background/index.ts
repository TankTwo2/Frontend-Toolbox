// 확장 프로그램 설치 시 실행
chrome.runtime.onInstalled.addListener(() => {
  console.log('Frontend Toolbox extension installed');
  
  // 기본 설정 저장
  chrome.storage.local.set({
    toolboxSettings: {
      autoEnable: false,
      defaultTools: ['imageDownloader', 'styleInspector', 'videoRecorder'],
      theme: 'light'
    },
    recordings: [],
    savedStyles: []
  });

  // 컨텍스트 메뉴 생성
  chrome.contextMenus.create({
    id: 'analyze-element',
    title: 'Frontend Toolbox로 스타일 분석',
    contexts: ['all']
  });
});

// 메시지 처리
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'getSettings':
      chrome.storage.local.get(['toolboxSettings'], (result) => {
        sendResponse(result.toolboxSettings || {});
      });
      return true;
      
    case 'saveSettings':
      chrome.storage.local.set({
        toolboxSettings: message.settings
      }, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'styleExtracted':
      // Style inspector에서 추출된 스타일 데이터 처리
      console.log('Style extracted:', message.data);
      sendResponse({ success: true });
      break;

    case 'recordingStarted':
      console.log('Recording started:', message.data);
      sendResponse({ success: true });
      break;

    case 'recordingCompleted':
      console.log('Recording completed:', message.data);
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// 탭 업데이트 이벤트 처리
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log(`Tab updated: ${tab.url}`);
  }
});

// 컨텍스트 메뉴 클릭 처리
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'analyze-element' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'startStyleInspector'
    });
  }
});

// 다운로드 처리를 위한 헬퍼 함수
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'download') {
    chrome.downloads.download({
      url: message.url,
      filename: message.filename,
      conflictAction: 'uniquify' // 중복 파일명 처리
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download error:', chrome.runtime.lastError);
        sendResponse({ error: chrome.runtime.lastError.message });
      } else if (downloadId) {
        sendResponse({ success: true, downloadId });
      } else {
        sendResponse({ error: 'Download failed' });
      }
    });
    return true;
  }
});