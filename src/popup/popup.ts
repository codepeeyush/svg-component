import { SVGInfo, ExtensionMessage } from '../types/messages';

/**
 * Popup UI controller for the SVG to Component Converter extension
 */

class PopupController {
  private svgs: SVGInfo[] = [];
  private isOverlayEnabled = false;
  private selectedSVGIndex: number | null = null;
  private currentCode: string = '';
  private currentFormat: 'tsx' | 'jsx' = 'tsx';

  // DOM elements
  private elements = {
    svgCount: document.getElementById('svgCount')!,
    noSvgsMessage: document.getElementById('noSvgsMessage')!,
    mainContent: document.getElementById('mainContent')!,
    toggleOverlay: document.getElementById('toggleOverlay')!,
    overlayText: document.getElementById('overlayText')!,
    svgList: document.getElementById('svgList')!,
    conversionPanel: document.getElementById('conversionPanel')!,
    closePanel: document.getElementById('closePanel')!,
    selectedIndex: document.getElementById('selectedIndex')!,
    componentName: document.getElementById('componentName') as HTMLInputElement,
    formatRadios: document.querySelectorAll<HTMLInputElement>('input[name="format"]'),
    optimizeSvg: document.getElementById('optimizeSvg') as HTMLInputElement,
    propWidth: document.getElementById('propWidth') as HTMLInputElement,
    propHeight: document.getElementById('propHeight') as HTMLInputElement,
    propClassName: document.getElementById('propClassName') as HTMLInputElement,
    propColor: document.getElementById('propColor') as HTMLInputElement,
    convertBtn: document.getElementById('convertBtn')!,
    resultSection: document.getElementById('resultSection')!,
    codeOutput: document.getElementById('codeOutput')!,
    copyBtn: document.getElementById('copyBtn')!,
    downloadBtn: document.getElementById('downloadBtn')!,
    copyNotification: document.getElementById('copyNotification')!
  };

  constructor() {
    this.init();
  }

  private async init() {
    // Set up event listeners
    this.setupEventListeners();

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id) {
      this.showNoSVGs();
      return;
    }

    // Request SVG information from content script
    try {
      const response = await this.sendMessageToTab(tab.id, { type: 'GET_SVGS' });

      if (response && response.type === 'SVGS_FOUND') {
        this.svgs = response.data.svgs;
        this.updateUI();
      } else {
        this.showNoSVGs();
      }
    } catch (error) {
      console.error('Error getting SVGs:', error);
      this.showNoSVGs();
    }

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
      if (message.type === 'SVG_SELECTED') {
        this.showConversionPanel(message.data.index);
      }
    });
  }

  private setupEventListeners() {
    // Toggle overlay button
    this.elements.toggleOverlay.addEventListener('click', () => {
      this.toggleOverlay();
    });

    // Close panel button
    this.elements.closePanel.addEventListener('click', () => {
      this.hideConversionPanel();
    });

    // Convert button
    this.elements.convertBtn.addEventListener('click', () => {
      this.convertSVG();
    });

    // Copy button
    this.elements.copyBtn.addEventListener('click', () => {
      this.copyToClipboard();
    });

    // Download button
    this.elements.downloadBtn.addEventListener('click', () => {
      this.downloadFile();
    });

    // Format radio change
    this.elements.formatRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.currentFormat = (e.target as HTMLInputElement).value as 'tsx' | 'jsx';
      });
    });
  }

  private async sendMessageToTab(tabId: number, message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  private async getCurrentTab(): Promise<chrome.tabs.Tab> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  private updateUI() {
    const count = this.svgs.length;

    // Update count badge
    this.elements.svgCount.textContent = `${count} SVG${count !== 1 ? 's' : ''}`;

    if (count === 0) {
      this.showNoSVGs();
      return;
    }

    // Show main content
    this.elements.noSvgsMessage.classList.add('hidden');
    this.elements.mainContent.classList.remove('hidden');

    // Render SVG list
    this.renderSVGList();
  }

  private renderSVGList() {
    this.elements.svgList.innerHTML = '';

    this.svgs.forEach((svg, index) => {
      const item = document.createElement('div');
      item.className = 'svg-item';

      const header = document.createElement('div');
      header.className = 'svg-item-header';

      const title = document.createElement('div');
      title.className = 'svg-item-title';
      title.textContent = `SVG #${index + 1}`;

      const badge = document.createElement('div');
      badge.className = 'svg-item-badge';
      badge.textContent = svg.isExternal ? 'External' : 'Inline';

      header.appendChild(title);
      header.appendChild(badge);

      const details = document.createElement('div');
      details.className = 'svg-item-details';

      const detailParts: string[] = [];
      if (svg.width && svg.height) {
        detailParts.push(`${svg.width} × ${svg.height}`);
      } else if (svg.viewBox) {
        detailParts.push(`viewBox: ${svg.viewBox}`);
      }

      if (svg.isExternal && svg.src) {
        const filename = svg.src.split('/').pop() || 'unknown';
        detailParts.push(filename);
      }

      details.textContent = detailParts.join(' • ') || 'No dimensions';

      item.appendChild(header);
      item.appendChild(details);

      // Click handler
      item.addEventListener('click', () => {
        this.showConversionPanel(index);
      });

      this.elements.svgList.appendChild(item);
    });
  }

  private showNoSVGs() {
    this.elements.svgCount.textContent = '0 SVGs';
    this.elements.noSvgsMessage.classList.remove('hidden');
    this.elements.mainContent.classList.add('hidden');
  }

  private async toggleOverlay() {
    this.isOverlayEnabled = !this.isOverlayEnabled;

    const tab = await this.getCurrentTab();
    if (!tab.id) return;

    try {
      await this.sendMessageToTab(tab.id, {
        type: 'TOGGLE_OVERLAY',
        data: { enabled: this.isOverlayEnabled }
      });

      this.elements.overlayText.textContent = this.isOverlayEnabled
        ? 'Hide SVG Overlay'
        : 'Show SVG Overlay';

      this.elements.toggleOverlay.style.background = this.isOverlayEnabled
        ? '#10b981'
        : '#3b82f6';
    } catch (error) {
      console.error('Error toggling overlay:', error);
    }
  }

  private showConversionPanel(index: number) {
    this.selectedSVGIndex = index;
    this.elements.selectedIndex.textContent = String(index + 1);

    // Generate default component name
    const defaultName = `SvgIcon${index + 1}`;
    this.elements.componentName.value = defaultName;

    // Reset result section
    this.elements.resultSection.classList.add('hidden');
    this.currentCode = '';

    // Show panel
    this.elements.conversionPanel.classList.remove('hidden');
  }

  private hideConversionPanel() {
    this.elements.conversionPanel.classList.add('hidden');
    this.selectedSVGIndex = null;
  }

  private async convertSVG() {
    if (this.selectedSVGIndex === null) return;

    const tab = await this.getCurrentTab();
    if (!tab.id) return;

    // Get form values
    const componentName = this.elements.componentName.value.trim() || 'MyIcon';
    const format = Array.from(this.elements.formatRadios).find(r => r.checked)?.value as 'tsx' | 'jsx' || 'tsx';
    const optimize = this.elements.optimizeSvg.checked;

    const addProps = {
      width: this.elements.propWidth.checked,
      height: this.elements.propHeight.checked,
      className: this.elements.propClassName.checked,
      color: this.elements.propColor.checked
    };

    // Disable convert button
    this.elements.convertBtn.textContent = 'Converting...';
    this.elements.convertBtn.setAttribute('disabled', 'true');

    try {
      const response = await this.sendMessageToTab(tab.id, {
        type: 'CONVERT_SVG',
        data: {
          index: this.selectedSVGIndex,
          format,
          componentName,
          optimize,
          addProps
        }
      });

      if (response && response.type === 'SVG_CONVERTED') {
        this.currentCode = response.data.code;
        this.currentFormat = format;
        this.displayResult(response.data.code);
      } else if (response && response.type === 'ERROR') {
        alert('Error converting SVG: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error converting SVG:', error);
      alert('Error converting SVG. Please try again.');
    } finally {
      this.elements.convertBtn.textContent = 'Convert';
      this.elements.convertBtn.removeAttribute('disabled');
    }
  }

  private displayResult(code: string) {
    this.elements.codeOutput.textContent = code;
    this.elements.resultSection.classList.remove('hidden');
  }

  private async copyToClipboard() {
    if (!this.currentCode) return;

    try {
      await navigator.clipboard.writeText(this.currentCode);
      this.showNotification('Copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);

      // Fallback method
      const textarea = document.createElement('textarea');
      textarea.value = this.currentCode;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);

      this.showNotification('Copied to clipboard!');
    }
  }

  private downloadFile() {
    if (!this.currentCode) return;

    const componentName = this.elements.componentName.value.trim() || 'MyIcon';
    const extension = this.currentFormat;
    const filename = `${componentName}.${extension}`;

    const blob = new Blob([this.currentCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);

    this.showNotification(`Downloaded ${filename}!`);
  }

  private showNotification(message: string) {
    this.elements.copyNotification.textContent = message;
    this.elements.copyNotification.classList.remove('hidden');

    setTimeout(() => {
      this.elements.copyNotification.classList.add('hidden');
    }, 2000);
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
