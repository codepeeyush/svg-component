/**
 * Popup UI controller for the SVG to Component Converter extension
 */

interface HistoryItem {
  format: 'tsx' | 'jsx' | 'svg';
  code: string;
  svgContent: string;
  timestamp: number;
}

class PopupController {
  private elements = {
    enableToggle: document.getElementById('enableToggle') as HTMLInputElement,
    formatRadios: document.querySelectorAll<HTMLInputElement>('input[name="format"]'),
    historyList: document.getElementById('historyList')!,
    clearHistory: document.getElementById('clearHistory')!
  };

  constructor() {
    this.init();
  }

  private async init() {
    // Load saved settings
    const settings = await chrome.storage.local.get(['enabled', 'format', 'history']);

    // Apply settings to UI
    this.elements.enableToggle.checked = settings.enabled !== false; // Default true

    const savedFormat = settings.format || 'tsx';
    this.elements.formatRadios.forEach(radio => {
      radio.checked = radio.value === savedFormat;
    });

    // Load and render history
    await this.renderHistory(settings.history || []);

    // Add event listeners
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Enable/Disable toggle
    this.elements.enableToggle.addEventListener('change', () => {
      this.saveSettings();
    });

    // Format selection
    this.elements.formatRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.saveSettings();
      });
    });

    // Clear history button
    this.elements.clearHistory.addEventListener('click', async () => {
      await chrome.storage.local.set({ history: [] });
      this.renderHistory([]);
    });
  }

  private async saveSettings() {
    const enabled = this.elements.enableToggle.checked;
    const format = Array.from(this.elements.formatRadios).find(r => r.checked)?.value || 'tsx';

    await chrome.storage.local.set({ enabled, format });
  }

  private async renderHistory(history: HistoryItem[]) {
    const container = this.elements.historyList;

    if (!history || history.length === 0) {
      container.innerHTML = '<p class="empty-state">No SVGs copied yet</p>';
      return;
    }

    container.innerHTML = '';

    // Show most recent first
    const reversed = [...history].reverse();

    reversed.forEach((item, index) => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.title = `Click to copy as ${item.format.toUpperCase()}`;

      // Render SVG preview
      const wrapper = document.createElement('div');
      wrapper.innerHTML = item.svgContent;
      const svg = wrapper.querySelector('svg');
      if (svg) {
        historyItem.appendChild(svg);
      }

      // Add format badge
      const badge = document.createElement('span');
      badge.className = 'format-badge';
      badge.textContent = item.format.toUpperCase();
      historyItem.appendChild(badge);

      // Click handler to copy
      historyItem.addEventListener('click', async () => {
        await navigator.clipboard.writeText(item.code);

        // Visual feedback
        historyItem.classList.add('copied');
        const originalBadgeText = badge.textContent;
        badge.textContent = '✓';

        setTimeout(() => {
          historyItem.classList.remove('copied');
          badge.textContent = originalBadgeText;
        }, 1000);
      });

      container.appendChild(historyItem);
    });
  }
}

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
  });
} else {
  new PopupController();
}
