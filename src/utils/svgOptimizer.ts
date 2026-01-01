import { optimize, OptimizeOptions } from 'svgo/dist/svgo.browser.js';

type Config = OptimizeOptions;

/**
 * Default SVGO configuration for optimizing SVGs
 */
const defaultConfig: Config = {
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // Don't remove viewBox as it's important for scaling
          removeViewBox: false,
          // Keep useful attributes for React components
          removeUnknownsAndDefaults: {
            keepRoleAttr: true,
            keepAriaAttrs: true
          }
        }
      }
    },
    // Remove unnecessary metadata
    'removeMetadata',
    // Remove comments
    'removeComments',
    // Remove hidden elements
    'removeHiddenElems',
    // Remove empty attributes
    'removeEmptyAttrs',
    // Remove empty containers
    'removeEmptyContainers',
    // Clean up IDs
    'cleanupIds',
    // Merge paths where possible
    'mergePaths',
    // Convert colors to shorter format
    'convertColors',
    // Remove unnecessary whitespace
    'removeUselessStrokeAndFill'
  ]
};

/**
 * Optimize SVG content using SVGO
 */
export async function optimizeSVG(svgContent: string): Promise<string> {
  try {
    const result = optimize(svgContent, defaultConfig);
    return result.data;
  } catch (error) {
    console.error('Error optimizing SVG:', error);
    // Return original content if optimization fails
    return svgContent;
  }
}

/**
 * Get SVG content from an SVG element
 */
export function getSVGContent(element: SVGSVGElement): string {
  return element.outerHTML;
}

/**
 * Parse optimized SVG string back to SVGSVGElement
 */
export function parseSVGString(svgString: string): SVGSVGElement {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = doc.querySelector('svg');

  if (!svgElement) {
    throw new Error('Invalid SVG string');
  }

  return svgElement as unknown as SVGSVGElement;
}

/**
 * Fetch and optimize external SVG file
 */
export async function fetchAndOptimizeSVG(url: string): Promise<SVGSVGElement> {
  try {
    const response = await fetch(url);
    const svgText = await response.text();
    const optimized = await optimizeSVG(svgText);
    return parseSVGString(optimized);
  } catch (error) {
    console.error('Error fetching SVG:', error);
    throw new Error(`Failed to fetch SVG from ${url}`);
  }
}
