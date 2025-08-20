// 확장 프로그램 설치 시 실행
chrome.runtime.onInstalled.addListener(() => {
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
    id: 'frontend-toolbox-parent',
    title: 'Frontend Toolbox',
    contexts: ['all']
  });

  chrome.contextMenus.create({
    id: 'image-downloader',
    parentId: 'frontend-toolbox-parent',
    title: '🖼️ 이미지 다운로더',
    contexts: ['all']
  });

  chrome.contextMenus.create({
    id: 'style-inspector',
    parentId: 'frontend-toolbox-parent',
    title: '🔍 스타일 검사기',
    contexts: ['all']
  });

  chrome.contextMenus.create({
    id: 'video-recorder',
    parentId: 'frontend-toolbox-parent',
    title: '🎥 비디오 녹화기',
    contexts: ['all']
  });
});

// 탭 업데이트 이벤트 처리
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Tab update listener for future use
});

// 컨텍스트 메뉴 클릭 처리
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  switch (info.menuItemId) {
    case 'image-downloader':
      chrome.tabs.sendMessage(tab.id, {
        action: 'openImageDownloader'
      });
      break;
    
    case 'style-inspector':
      chrome.tabs.sendMessage(tab.id, {
        action: 'openStyleInspector'
      });
      break;
    
    case 'video-recorder':
      chrome.tabs.sendMessage(tab.id, {
        action: 'openVideoRecorder'
      });
      break;
  }
});

// 통합 메시지 처리
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

    case 'getImages':
      // 현재 탭에서 이미지 수집
      if (sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, { action: 'collectImages' }, (response) => {
          sendResponse(response || { images: [] });
        });
      } else {
        sendResponse({ images: [] });
      }
      return true;

    case 'downloadImage':
      // 단일 이미지 다운로드
      if (message.data?.image) {
        chrome.downloads.download({
          url: message.data.image.src || message.data.image.url,
          filename: generateImageFilename(message.data.image),
          conflictAction: 'uniquify'
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error('Download error:', chrome.runtime.lastError);
            sendResponse({ error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ success: true, downloadId });
          }
        });
      } else {
        sendResponse({ error: 'No image data provided' });
      }
      return true;

    case 'downloadImages':
      // 다중 이미지 다운로드
      if (message.data?.images) {
        downloadMultipleImages(message.data.images, sendResponse);
      } else {
        sendResponse({ error: 'No images data provided' });
      }
      return true;

    case 'download':
      // 일반 다운로드 (기존 호환성)
      chrome.downloads.download({
        url: message.url,
        filename: message.filename,
        conflictAction: 'uniquify'
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

    case 'startStyleInspector':
      // 스타일 검사기 시작
      if (sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, { action: 'activateStyleInspector' }, (response) => {
          sendResponse(response || { success: true });
        });
      } else {
        sendResponse({ error: 'No active tab' });
      }
      return true;

    case 'stopStyleInspector':
      // 스타일 검사기 중지
      if (sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, { action: 'deactivateStyleInspector' }, (response) => {
          sendResponse(response || { success: true });
        });
      } else {
        sendResponse({ error: 'No active tab' });
      }
      return true;

    case 'styleExtracted':
      // Style inspector에서 추출된 스타일 데이터 처리
      // 스타일을 저장소에 저장
      chrome.storage.local.get('savedStyles', (result) => {
        const savedStyles = result.savedStyles || [];
        const newStyle = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          selector: message.data.selector,
          properties: message.data.properties,
          css: generateCSSFromStyleData(message.data),
          tailwind: generateTailwindFromStyleData(message.data)
        };
        
        savedStyles.push(newStyle);
        
        chrome.storage.local.set({ savedStyles }, () => {
          sendResponse({ success: true, savedStyle: newStyle });
          
          // React 컴포넌트에 새로운 스타일 저장 완료 알림
          if (sender.tab?.id) {
            chrome.tabs.sendMessage(sender.tab.id, {
              action: 'stylesSaved',
              data: { savedStyles, newStyle }
            });
          }
        });
      });
      return true;

    case 'recordingStarted':
      sendResponse({ success: true });
      break;

    case 'recordingCompleted':
      sendResponse({ success: true });
      break;

    case 'startVideoRecording':
      // 비디오 녹화 시작 - 탭 캡처 처리
      if (message.data?.videoType === 'tab' && sender.tab?.id) {
        const constraints = {
          audio: message.data.audio || false,
          video: true
        };
        
        chrome.tabCapture.capture(constraints, (stream) => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: `탭 캡처 실패: ${chrome.runtime.lastError.message}` });
            return;
          }
          
          if (!stream) {
            sendResponse({ error: '탭 스트림을 생성할 수 없습니다.' });
            return;
          }

          // 스트림을 content script로 전달하기 위해 stream을 직렬화
          sendResponse({ success: true, streamId: stream.id });
        });
      } else {
        sendResponse({ 
          error: '화면/영역 녹화는 content script에서 getDisplayMedia를 사용하세요.' 
        });
      }
      return true;

    case 'stopVideoRecording':
      sendResponse({ 
        error: '비디오 녹화 중지는 content script에서 처리됩니다.' 
      });
      break;

    case 'downloadRecording':
      if (message.data?.recording) {
        // 녹화 파일 다운로드는 blob URL 기반으로 처리
        sendResponse({ success: true });
      } else {
        sendResponse({ error: 'No recording data provided' });
      }
      break;

    case 'deleteRecording':
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// 헬퍼 함수들
function generateImageFilename(image: any): string {
  if (image.type === 'svg') {
    const baseName = image.alt || 'svg-image';
    return `${baseName}.svg`;
  }

  if (image.src && image.src.startsWith('blob:')) {
    const baseName = image.alt || 'image';
    const extension = image.type === 'background' ? 'jpg' : 'png';
    return `${baseName}.${extension}`;
  }

  try {
    const url = new URL(image.src || image.url);
    const pathname = url.pathname;
    let filename = pathname.split('/').pop() || 'image';
    
    if (!filename.includes('.')) {
      let extension = getImageExtension(image.src || image.url);
      if (!extension) {
        extension = image.type === 'background' ? 'jpg' : 'png';
      }
      return `${filename}.${extension}`;
    }
    
    return filename;
  } catch {
    const baseName = image.alt || 'image';
    const extension = image.type === 'background' ? 'jpg' : 'png';
    return `${baseName}.${extension}`;
  }
}

function getImageExtension(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\.(jpg|jpeg|png|gif|svg|webp|bmp)(\?|$)/i);
  return match ? match[1].toLowerCase() : null;
}

function generateCSSFromStyleData(styleData: any): string {
  const { properties, selector } = styleData;
  let css = `${selector} {\n`;

  // Add important properties first
  const importantProps = ['display', 'position', 'width', 'height', 'color', 'background-color', 'font-size', 'font-family'];
  
  importantProps.forEach(prop => {
    Object.entries(properties).forEach(([category, props]: [string, any]) => {
      if (props[prop]) {
        css += `  ${prop}: ${props[prop]};\n`;
      }
    });
  });

  // Add other properties by category
  Object.entries(properties).forEach(([category, props]: [string, any]) => {
    Object.entries(props).forEach(([prop, value]: [string, any]) => {
      if (!importantProps.includes(prop) && value && value !== 'initial' && value !== 'normal') {
        css += `  ${prop}: ${value};\n`;
      }
    });
  });

  css += '}';
  return css;
}

function generateTailwindFromStyleData(styleData: any): string {
  const { properties, tailwindClasses } = styleData;
  const classes: string[] = [...(tailwindClasses || [])];

  // Convert common CSS properties to Tailwind classes
  const cssToTailwind: Record<string, (value: string) => string | null> = {
    'display': (value) => {
      const map: Record<string, string> = {
        'block': 'block',
        'inline': 'inline',
        'inline-block': 'inline-block',
        'flex': 'flex',
        'inline-flex': 'inline-flex',
        'grid': 'grid',
        'hidden': 'hidden'
      };
      return map[value] || null;
    },
    'text-align': (value) => {
      const map: Record<string, string> = {
        'left': 'text-left',
        'center': 'text-center',
        'right': 'text-right',
        'justify': 'text-justify'
      };
      return map[value] || null;
    },
    'font-weight': (value) => {
      const map: Record<string, string> = {
        '100': 'font-thin',
        '200': 'font-extralight',
        '300': 'font-light',
        '400': 'font-normal',
        '500': 'font-medium',
        '600': 'font-semibold',
        '700': 'font-bold',
        '800': 'font-extrabold',
        '900': 'font-black'
      };
      return map[value] || null;
    }
  };

  Object.entries(properties).forEach(([category, props]: [string, any]) => {
    Object.entries(props).forEach(([prop, value]: [string, any]) => {
      const converter = cssToTailwind[prop];
      if (converter) {
        const tailwindClass = converter(value);
        if (tailwindClass && !classes.includes(tailwindClass)) {
          classes.push(tailwindClass);
        }
      }
    });
  });

  return classes.join(' ');
}

function downloadMultipleImages(images: any[], sendResponse: (response: any) => void) {
  let completed = 0;
  let errors = 0;
  const total = images.length;

  if (total === 0) {
    sendResponse({ success: true, downloaded: 0, errors: 0 });
    return;
  }

  images.forEach((image, index) => {
    // 순차적 다운로드를 위한 지연
    setTimeout(() => {
      chrome.downloads.download({
        url: image.src || image.url,
        filename: generateImageFilename(image),
        conflictAction: 'uniquify'
      }, (downloadId) => {
        if (chrome.runtime.lastError || !downloadId) {
          errors++;
        } else {
          completed++;
        }

        // 모든 다운로드 완료 체크
        if (completed + errors === total) {
          sendResponse({ 
            success: true, 
            downloaded: completed, 
            errors: errors,
            total: total
          });
        }
      });
    }, index * 200); // 200ms 간격으로 다운로드
  });
}