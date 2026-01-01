/**
 * Background service worker for the SVG to Component Converter extension
 */

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_BADGE') {
    updateBadge(sender.tab?.id, message.data.count);
  }
});

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
