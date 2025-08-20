const isValidUrl = (url: string): boolean => {
  // Chrome 내부 페이지들은 지원하지 않음
  const unsupportedProtocols = ['chrome:', 'chrome-extension:', 'moz-extension:', 'edge:', 'about:'];
  return !unsupportedProtocols.some(protocol => url.startsWith(protocol));
};

export const ensureContentScriptLoaded = async (tabId: number): Promise<boolean> => {
  try {
    // 현재 탭 정보 확인
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || !isValidUrl(tab.url)) {
      throw new Error('이 페이지에서는 확장 프로그램을 사용할 수 없습니다. 웹사이트로 이동한 후 다시 시도해주세요.');
    }

    // Try to ping the content script
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    return true;
  } catch (error) {
    const err = error as Error;
    // URL 검증 오류는 바로 전파
    if (err.message.includes('이 페이지에서는')) {
      throw error;
    }

    // Content script not loaded, inject it
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      // Wait a bit for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Try to ping again to confirm it's loaded
      try {
        await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        return true;
      } catch {
        return false;
      }
    } catch (injectError) {
      console.error('Failed to inject content script:', injectError);
      return false;
    }
  }
};

export const sendMessageToContentScript = async (tabId: number, message: any): Promise<any> => {
  const isLoaded = await ensureContentScriptLoaded(tabId);
  if (!isLoaded) {
    throw new Error('Content script could not be loaded. Please refresh the page and try again.');
  }
  
  return chrome.tabs.sendMessage(tabId, message);
};