import { SVGInfo, ExtensionMessage } from '../types/messages';
import { convertSVGToComponent, ConversionOptions } from '../utils/svgConverter';
import { optimizeSVG, getSVGContent, fetchAndOptimizeSVG, parseSVGString } from '../utils/svgOptimizer';

/**
 * Content script for detecting and highlighting SVGs on the page
 */

class SVGDetector {
  private svgElements: (SVGSVGElement | HTMLImageElement | HTMLObjectElement)[] = [];
  private overlays: Map<number, HTMLElement> = new Map();
  private isOverlayEnabled = false;

  constructor() {
    this.init();
  }

  private init() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
      this.handleMessage(message, sendResponse);
      return true; // Keep channel open for async response
    });

    // Detect SVGs on page load
    this.detectSVGs();

    // Watch for dynamically added SVGs
    this.observeDOMChanges();
  }

  /**
   * Detect all SVG elements on the page
   */
  private detectSVGs() {
    this.svgElements = [];

    // Find inline SVG elements
    const inlineSVGs = document.querySelectorAll('svg');
    inlineSVGs.forEach(svg => {
      this.svgElements.push(svg as SVGSVGElement);
    });

    // Find external SVG files (img tags with .svg src)
    const svgImages = document.querySelectorAll('img[src$=".svg"]');
    svgImages.forEach(img => {
      this.svgElements.push(img as HTMLImageElement);
    });

    // Find SVG objects
    const svgObjects = document.querySelectorAll('object[data$=".svg"]');
    svgObjects.forEach(obj => {
      this.svgElements.push(obj as HTMLObjectElement);
    });

    // Update badge with count
    this.updateBadge();
  }

  /**
   * Watch for DOM changes to detect dynamically added SVGs
   */
  private observeDOMChanges() {
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;

      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (
              element.tagName === 'svg' ||
              (element.tagName === 'IMG' && element.getAttribute('src')?.endsWith('.svg')) ||
              (element.tagName === 'OBJECT' && element.getAttribute('data')?.endsWith('.svg'))
            ) {
              shouldUpdate = true;
            }
          }
        });
      });

      if (shouldUpdate) {
        this.detectSVGs();
        if (this.isOverlayEnabled) {
          this.createOverlays();
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Update extension badge with SVG count
   */
  private updateBadge() {
    chrome.runtime.sendMessage({
      type: 'UPDATE_BADGE',
      data: { count: this.svgElements.length }
    });
  }

  /**
   * Get information about all detected SVGs
   */
  private getSVGInfo(): SVGInfo[] {
    return this.svgElements.map((element, index) => {
      const isExternal = element.tagName !== 'svg';
      const svg = element as SVGSVGElement;

      return {
        index,
        tagName: element.tagName.toLowerCase(),
        width: isExternal ? element.getAttribute('width') : svg.getAttribute('width'),
        height: isExternal ? element.getAttribute('height') : svg.getAttribute('height'),
        viewBox: isExternal ? null : svg.getAttribute('viewBox'),
        hasInlineStyles: !isExternal && svg.hasAttribute('style'),
        isExternal,
        src: isExternal ? (element as HTMLImageElement).src || (element as HTMLObjectElement).data : undefined
      };
    });
  }

  /**
   * Create overlay highlights for all SVGs
   */
  private createOverlays() {
    // Remove existing overlays
    this.removeOverlays();

    this.svgElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const overlay = document.createElement('div');

      overlay.className = 'svg-converter-overlay';
      overlay.dataset.svgIndex = String(index);

      overlay.style.cssText = `
        position: absolute;
        top: ${rect.top + window.scrollY}px;
        left: ${rect.left + window.scrollX}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        border: 2px solid #3b82f6;
        background: rgba(59, 130, 246, 0.1);
        cursor: pointer;
        z-index: 999999;
        pointer-events: all;
        box-sizing: border-box;
        transition: all 0.2s ease;
      `;

      // Add label
      const label = document.createElement('div');
      label.textContent = `SVG #${index + 1}`;
      label.style.cssText = `
        position: absolute;
        top: -24px;
        left: 0;
        background: #3b82f6;
        color: white;
        padding: 2px 8px;
        font-size: 12px;
        font-family: system-ui, -apple-system, sans-serif;
        border-radius: 3px;
        white-space: nowrap;
      `;
      overlay.appendChild(label);

      // Add click handler
      overlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleOverlayClick(index);
      });

      // Add hover effect
      overlay.addEventListener('mouseenter', () => {
        overlay.style.background = 'rgba(59, 130, 246, 0.2)';
        overlay.style.borderWidth = '3px';
      });

      overlay.addEventListener('mouseleave', () => {
        overlay.style.background = 'rgba(59, 130, 246, 0.1)';
        overlay.style.borderWidth = '2px';
      });

      document.body.appendChild(overlay);
      this.overlays.set(index, overlay);
    });
  }

  /**
   * Remove all overlay highlights
   */
  private removeOverlays() {
    this.overlays.forEach(overlay => {
      overlay.remove();
    });
    this.overlays.clear();
  }

  /**
   * Handle overlay click - notify popup to show conversion panel
   */
  private handleOverlayClick(index: number) {
    chrome.runtime.sendMessage({
      type: 'SVG_SELECTED',
      data: { index }
    });
  }

  /**
   * Convert SVG to component code
   */
  private async convertSVG(
    index: number,
    format: 'tsx' | 'jsx',
    componentName: string,
    optimize: boolean,
    addProps: ConversionOptions['addProps']
  ): Promise<{ code: string; originalSVG: string }> {
    const element = this.svgElements[index];
    let svgElement: SVGSVGElement;

    // Handle external SVG files
    if (element.tagName !== 'svg') {
      const src = (element as HTMLImageElement).src || (element as HTMLObjectElement).data;
      if (!src) {
        throw new Error('External SVG has no source URL');
      }
      svgElement = await fetchAndOptimizeSVG(src);
    } else {
      svgElement = element as SVGSVGElement;
    }

    let processedSVG = svgElement;

    // Optimize if requested
    if (optimize) {
      const svgContent = getSVGContent(svgElement);
      const optimized = await optimizeSVG(svgContent);
      processedSVG = parseSVGString(optimized);
    }

    // Convert to component
    const options: ConversionOptions = {
      format,
      componentName,
      addProps
    };

    const code = convertSVGToComponent(processedSVG, options);
    const originalSVG = getSVGContent(svgElement);

    return { code, originalSVG };
  }

  /**
   * Handle messages from popup and background
   */
  private async handleMessage(message: ExtensionMessage, sendResponse: (response: any) => void) {
    try {
      switch (message.type) {
        case 'GET_SVGS':
          sendResponse({
            type: 'SVGS_FOUND',
            data: {
              svgs: this.getSVGInfo(),
              count: this.svgElements.length
            }
          });
          break;

        case 'TOGGLE_OVERLAY':
          this.isOverlayEnabled = message.data.enabled;
          if (this.isOverlayEnabled) {
            this.createOverlays();
          } else {
            this.removeOverlays();
          }
          sendResponse({ type: 'SUCCESS' });
          break;

        case 'CONVERT_SVG':
          const result = await this.convertSVG(
            message.data.index,
            message.data.format,
            message.data.componentName,
            message.data.optimize,
            message.data.addProps
          );
          sendResponse({
            type: 'SVG_CONVERTED',
            data: result
          });
          break;

        case 'HIGHLIGHT_SVG':
          // Scroll to and briefly highlight a specific SVG
          const overlay = this.overlays.get(message.data.index);
          if (overlay) {
            overlay.scrollIntoView({ behavior: 'smooth', block: 'center' });
            overlay.style.background = 'rgba(59, 130, 246, 0.4)';
            setTimeout(() => {
              overlay.style.background = 'rgba(59, 130, 246, 0.1)';
            }, 1000);
          }
          sendResponse({ type: 'SUCCESS' });
          break;

        default:
          sendResponse({ type: 'ERROR', data: { message: 'Unknown message type' } });
      }
    } catch (error) {
      sendResponse({
        type: 'ERROR',
        data: { message: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  }
}

// Initialize the detector when the page loads
new SVGDetector();
