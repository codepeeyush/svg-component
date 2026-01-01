import { SVGInfo } from '../types/messages';
import { convertSVGToComponent, ConversionOptions } from '../utils/svgConverter';
import { optimizeSVG, getSVGContent, fetchAndOptimizeSVG, parseSVGString } from '../utils/svgOptimizer';

class SVGDetector {
  private enabled: boolean = true;
  private format: 'tsx' | 'jsx' | 'svg' = 'tsx';
  private svgElements: (SVGSVGElement | HTMLImageElement | HTMLObjectElement)[] = [];

  private popover: HTMLElement | null = null;
  private highlight: HTMLElement | null = null;
  private toast: HTMLElement | null = null;

  private currentTarget: Element | null = null;
  private hideTimeout: any = null;

  constructor() {
    this.init();
  }

  private async init() {
    // Load settings
    const settings = await chrome.storage.local.get(['enabled', 'format']);
    this.enabled = settings.enabled !== false;
    this.format = settings.format || 'tsx';

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        if (changes.enabled) this.enabled = changes.enabled.newValue;
        if (changes.format) this.format = changes.format.newValue;
      }
    });

    // Initial detection
    this.detectSVGs();
    this.observeDOMChanges();

    // Global event listeners for hover delegating
    document.addEventListener('mouseover', this.handleMouseOver.bind(this));

    // Create UI elements
    this.createUI();
  }

  private createUI() {
    // Popover
    this.popover = document.createElement('div');
    this.popover.className = 'svg-popover';
    this.popover.innerHTML = `
      <span>SVG Detected</span>
      <button id="svg-copy-btn">Copy as TSX</button>
    `;
    document.body.appendChild(this.popover);

    // Copy Button Listener
    const btn = this.popover.querySelector('#svg-copy-btn');
    btn?.addEventListener('click', this.handleCopy.bind(this));

    // Cleanup hiding when hovering the popover itself
    this.popover.addEventListener('mouseenter', () => {
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;
      }
    });

    this.popover.addEventListener('mouseleave', () => {
      this.scheduleHide();
    });

    // Highlight Box
    this.highlight = document.createElement('div');
    this.highlight.className = 'svg-popover-highlight';
    document.body.appendChild(this.highlight);

    // Toast
    this.toast = document.createElement('div');
    this.toast.className = 'svg-toast';
    this.toast.textContent = 'Copied to clipboard!';
    document.body.appendChild(this.toast);
  }

  private handleMouseOver(e: MouseEvent) {
    if (!this.enabled) return;

    const target = e.target as Element;
    const svgElement = target.closest('svg, img[src$=".svg"], object[data$=".svg"]');

    if (svgElement && svgElement !== this.currentTarget) {
      if (this.hideTimeout) clearTimeout(this.hideTimeout);
      this.currentTarget = svgElement;
      this.showPopover(svgElement);
    } else if (!svgElement && !this.popover?.contains(target)) {
      // Only schedule hide if we really left an SVG and aren't in the popover
      // (The popover check is partly handled by its own listeners, but good to be safe)
      this.scheduleHide();
    }
  }

  private scheduleHide() {
    if (this.hideTimeout) return; // Already scheduled
    this.hideTimeout = setTimeout(() => {
      this.hidePopover();
      this.currentTarget = null;
      this.hideTimeout = null;
    }, 300); // Small delay to allow moving to popover
  }

  private showPopover(element: Element) {
    if (!this.popover || !this.highlight) return;

    const rect = element.getBoundingClientRect();

    // Update Highlight
    this.highlight.style.display = 'block';

    // Position highlight first
    this.highlight.style.top = `${window.scrollY + rect.top}px`;
    this.highlight.style.left = `${window.scrollX + rect.left}px`;
    this.highlight.style.width = `${rect.width}px`;
    this.highlight.style.height = `${rect.height}px`;

    // Force reflow and show
    this.highlight.getBoundingClientRect();
    this.highlight.style.opacity = '1';
    this.highlight.classList.add('visible');

    // Reset Button State
    const btn = this.popover.querySelector('button');
    if (btn) {
      btn.textContent = `Copy ${this.format.toUpperCase()}`;
      btn.classList.remove('copied');
      btn.style.width = ''; // Reset width constraint if any
    }

    // Position Popover (Top Right of element)
    const popoverRect = this.popover.getBoundingClientRect();
    let top = window.scrollY + rect.top - popoverRect.height - 8;
    let left = window.scrollX + rect.right - popoverRect.width;

    // Adjust if off screen
    if (top < window.scrollY) top = window.scrollY + rect.bottom + 8;
    if (left < window.scrollX) left = window.scrollX + rect.left;

    this.popover.style.top = `${top}px`;
    this.popover.style.left = `${left}px`;

    this.popover.classList.add('visible');
  }

  private hidePopover() {
    this.popover?.classList.remove('visible');

    // Reset button state slightly delayed to avoid jumpiness content change
    setTimeout(() => {
      const btn = this.popover?.querySelector('button');
      if (btn && !this.popover?.classList.contains('visible')) {
        btn.classList.remove('copied');
        btn.textContent = `Copy ${this.format.toUpperCase()}`;
      }
    }, 200);

    if (this.highlight) {
      this.highlight.classList.remove('visible');
      this.highlight.style.opacity = '0';
      // Wait for transition to finish before display: none
      setTimeout(() => {
        if (this.highlight && !this.highlight.classList.contains('visible')) {
          this.highlight.style.display = 'none';
        }
      }, 200);
    }
  }

  private async handleCopy() {
    if (!this.currentTarget) return;

    const element = this.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const scrollTop = window.scrollY;
    const scrollLeft = window.scrollX;

    // Dust Effect: 30-40 particles
    const particleCount = 36;
    const particles: HTMLElement[] = [];

    // Grid-based sampling for better coverage (6x6 grid)
    const rows = 6;
    const cols = 6;

    for (let i = 0; i < particleCount; i++) {
      const clone = element.cloneNode(true) as HTMLElement;
      clone.classList.add('particle-clone');

      const computed = window.getComputedStyle(element);
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      clone.style.fill = computed.fill;
      clone.style.stroke = computed.stroke;
      clone.style.color = computed.color;

      clone.style.position = 'absolute';
      clone.style.left = `${rect.left + scrollLeft}px`;
      clone.style.top = `${rect.top + scrollTop}px`;
      clone.style.pointerEvents = 'none';
      clone.style.zIndex = '10002';
      clone.style.transition = 'transform 1s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease-out';

      // Create smaller "dust" shards using clip-path on a grid
      const r = Math.floor(i / cols);
      const c = i % cols;
      const widthPct = 100 / cols;
      const heightPct = 100 / rows;

      // Add some jitter to the grid
      const jitterX = (Math.random() - 0.5) * 10;
      const jitterY = (Math.random() - 0.5) * 10;

      const top = r * heightPct + jitterY;
      const left = c * widthPct + jitterX;
      const bottom = 100 - (top + heightPct);
      const right = 100 - (left + widthPct);

      // Clamp values
      const safe = (v: number) => Math.max(0, Math.min(100, v));
      clone.style.clipPath = `inset(${safe(top)}% ${safe(right)}% ${safe(bottom)}% ${safe(left)}%)`;

      document.body.appendChild(clone);
      particles.push(clone);

      requestAnimationFrame(() => {
        // Dispersion logic: radiate outwards from center + gravity
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const partX = (c * (rect.width / cols));
        const partY = (r * (rect.height / rows));

        const vectorX = (partX - centerX) / (rect.width / 2); // -1 to 1
        const vectorY = (partY - centerY) / (rect.height / 2); // -1 to 1

        const dist = (Math.random() * 40) + 20;
        const x = vectorX * dist + (Math.random() - 0.5) * 20;
        const y = vectorY * dist - (Math.random() * 30); // Upward drift
        const rot = (Math.random() - 0.5) * 60;
        const scale = 0.4 + Math.random() * 0.4; // Shrink as they fly

        clone.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`;
        clone.style.opacity = '0';
      });
    }

    // Hide original
    element.classList.add('thanos-snap-target');

    // Hide highlight
    if (this.highlight) this.highlight.style.opacity = '0';

    // Button State Update
    const btn = this.popover?.querySelector('button');
    if (btn) {
      // preserve width to prevent layout shift
      btn.style.width = `${btn.offsetWidth}px`;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
    }

    try {
      const { code } = await this.convertSVG(this.currentTarget, this.format);
      await navigator.clipboard.writeText(code);
      // Removed toast as button state is feedback enough
      // this.showToast(); 

      // Cleanup
      setTimeout(() => {
        particles.forEach(p => p.remove());
      }, 1200);

      setTimeout(() => {
        element.classList.remove('thanos-snap-target');
      }, 2000);

    } catch (error) {
      console.error('Conversion error:', error);
      alert('Failed to convert SVG');
      element.classList.remove('thanos-snap-target');
      particles.forEach(p => p.remove());
      if (btn) {
        btn.textContent = 'Error';
        btn.classList.remove('copied');
      }
    }
  }

  private showToast() {
    if (!this.toast) return;
    this.toast.classList.add('visible');
    setTimeout(() => {
      this.toast?.classList.remove('visible');
    }, 2000);
  }

  private detectSVGs() {
    // Existing detection logic kept for potential future use or badge updating
    // For hover interaction, delegation handles it.
    // We might still want to count SVGs for badge?
    this.updateBadge(); // Initial simple count
  }

  private updateBadge() {
    const count = document.querySelectorAll('svg').length + document.querySelectorAll('img[src$=".svg"]').length;
    chrome.runtime.sendMessage({
      type: 'UPDATE_BADGE',
      data: { count }
    });
  }

  private observeDOMChanges() {
    const observer = new MutationObserver(() => {
      this.updateBadge();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  private async convertSVG(
    element: Element,
    format: 'tsx' | 'jsx' | 'svg'
  ): Promise<{ code: string; svgContent: string }> {
    let svgElement: SVGSVGElement;

    // Handle external SVG files
    if (element.tagName !== 'svg') {
      const src = (element as HTMLImageElement).src || (element as HTMLObjectElement).data;
      if (!src) throw new Error('External SVG has no source URL');
      svgElement = await fetchAndOptimizeSVG(src);
    } else {
      svgElement = element as SVGSVGElement;
    }

    const svgContent = getSVGContent(svgElement);
    const optimized = await optimizeSVG(svgContent);

    let code: string;

    // Handle SVG format separately
    if (format === 'svg') {
      code = optimized;
    } else {
      const processedSVG = parseSVGString(optimized);
      const options: ConversionOptions = {
        format,
        componentName: 'SvgIcon',
        addProps: {
          width: true,
          height: true,
          color: true,
          className: true
        }
      };
      code = convertSVGToComponent(processedSVG, options);
    }

    // Send to background for history storage
    chrome.runtime.sendMessage({
      type: 'ADD_HISTORY',
      data: {
        format,
        code,
        svgContent: optimized,
        timestamp: Date.now()
      }
    });

    return { code, svgContent: optimized };
  }
}

new SVGDetector();
