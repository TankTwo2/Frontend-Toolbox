export const ensureContentScriptLoaded = async (tabId: number): Promise<boolean> => {
  try {
    // Try to ping the content script
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    return true;
  } catch (error) {
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