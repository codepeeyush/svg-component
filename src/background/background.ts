/**
 * Background service worker for the SVG to Component Converter extension
 */

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_BADGE') {
    updateBadge(sender.tab?.id, message.data.count);
  } else if (message.type === 'ADD_HISTORY') {
    addToHistory(message.data);
  }
});

/**
 * Add item to clipboard history
 */
async function addToHistory(item: {
  format: string;
  code: string;
  svgContent: string;
  timestamp: number;
}) {
  const MAX_HISTORY_ITEMS = 30;

  // Get current history
  const result = await chrome.storage.local.get('history');
  const history = result.history || [];

  // Add new item at the end
  history.push(item);

  // Keep only last N items
  const trimmedHistory = history.slice(-MAX_HISTORY_ITEMS);

  // Save back
  await chrome.storage.local.set({ history: trimmedHistory });
}

/**
 * Update extension badge with SVG count
 */
function updateBadge(tabId: number | undefined, count: number) {
  if (!tabId) return;

  const badgeText = count > 0 ? String(count) : '';
  const badgeColor = count > 0 ? '#3b82f6' : '#6b7280';

  chrome.action.setBadgeText({
    tabId,
    text: badgeText
  });

  chrome.action.setBadgeBackgroundColor({
    tabId,
    color: badgeColor
  });
}

/**
 * Reset badge when tab is updated
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Badge will be updated by content script after page load
  }
});

/**
 * Clear badge when tab is activated
 */
chrome.tabs.onActivated.addListener((activeInfo) => {
  // Badge will be updated by content script
});

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('SVG to Component Converter extension installed');
});
