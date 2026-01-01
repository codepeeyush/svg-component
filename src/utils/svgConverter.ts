export interface ConversionOptions {
  format: 'tsx' | 'jsx';
  componentName: string;
  addProps?: {
    width?: boolean;
    height?: boolean;
    className?: boolean;
    color?: boolean;
  };
}

export interface PropConfig {
  name: string;
  type: string;
  defaultValue?: string;
}

// Attribute mapping from HTML/SVG to React/JSX
const attributeMap: Record<string, string> = {
  'class': 'className',
  'for': 'htmlFor',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'fill-opacity': 'fillOpacity',
  'stroke-opacity': 'strokeOpacity',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'stroke-miterlimit': 'strokeMiterlimit',
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'text-anchor': 'textAnchor',
  'dominant-baseline': 'dominantBaseline',
  'alignment-baseline': 'alignmentBaseline',
  'baseline-shift': 'baselineShift',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'xmlns:xlink': 'xmlnsXlink',
  'xlink:href': 'xlinkHref'
};

/**
 * Convert SVG attributes to JSX format
 */
function convertAttributes(element: Element): string {
  const attributes: string[] = [];

  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    let name = attr.name;
    let value = attr.value;

    // Skip xmlns as it's not needed in React
    if (name === 'xmlns' || name === 'xmlns:svg') continue;

    // Convert attribute name to JSX format
    name = attributeMap[name] || name;

    // Handle boolean attributes
    if (value === '' || value === name) {
      attributes.push(name);
    } else {
      // Escape quotes in value
      value = value.replace(/"/g, '\\"');
      attributes.push(`${name}="${value}"`);
    }
  }

  return attributes.join(' ');
}

/**
 * Convert SVG element and children to JSX string
 */
function elementToJSX(element: Element, indent: number = 0): string {
  const indentStr = '  '.repeat(indent);
  const tagName = element.tagName.toLowerCase();
  const attributes = convertAttributes(element);
  const attrStr = attributes ? ' ' + attributes : '';

  // Handle self-closing tags
  if (element.children.length === 0 && !element.textContent?.trim()) {
    return `${indentStr}<${tagName}${attrStr} />`;
  }

  // Handle elements with children
  const openTag = `${indentStr}<${tagName}${attrStr}>`;
  const closeTag = `${indentStr}</${tagName}>`;

  if (element.children.length === 0) {
    // Element with only text content
    const text = element.textContent?.trim() || '';
    if (text) {
      return `${indentStr}<${tagName}${attrStr}>${text}</${tagName}>`;
    }
    return `${indentStr}<${tagName}${attrStr} />`;
  }

  // Element with child elements
  const children: string[] = [];
  for (let i = 0; i < element.children.length; i++) {
    children.push(elementToJSX(element.children[i], indent + 1));
  }

  return [openTag, ...children, closeTag].join('\n');
}

/**
 * Generate prop definitions for TypeScript
 */
function generatePropTypes(options: ConversionOptions): { propsInterface: string; propsDestructure: string; propsUsage: Record<string, string> } {
  const props: PropConfig[] = [];
  const propsUsage: Record<string, string> = {};

  if (options.addProps?.width) {
    props.push({ name: 'width', type: 'number | string', defaultValue: '24' });
    propsUsage['width'] = '{width}';
  }

  if (options.addProps?.height) {
    props.push({ name: 'height', type: 'number | string', defaultValue: '24' });
    propsUsage['height'] = '{height}';
  }

  if (options.addProps?.className) {
    props.push({ name: 'className', type: 'string' });
    propsUsage['className'] = '{className}';
  }

  if (options.addProps?.color) {
    props.push({ name: 'color', type: 'string', defaultValue: '"currentColor"' });
    propsUsage['fill'] = '{color}';
    propsUsage['stroke'] = '{color}';
  }

  if (props.length === 0) {
    return { propsInterface: '', propsDestructure: '', propsUsage: {} };
  }

  const isTsx = options.format === 'tsx';

  // Generate TypeScript interface
  const propsInterface = isTsx ? `interface ${options.componentName}Props {
  ${props.map(p => `${p.name}?: ${p.type};`).join('\n  ')}
}\n\n` : '';

  // Generate destructuring with defaults
  const propsDestructure = `{ ${props.map(p =>
    p.defaultValue ? `${p.name} = ${p.defaultValue}` : p.name
  ).join(', ')} }${isTsx ? `: ${options.componentName}Props` : ''}`;

  return { propsInterface, propsDestructure, propsUsage };
}

/**
 * Apply prop replacements to SVG string
 */
function applyPropsToSVG(svgString: string, propsUsage: Record<string, string>): string {
  let result = svgString;

  for (const [attr, propValue] of Object.entries(propsUsage)) {
    // Replace attribute values with prop references
    const regex = new RegExp(`${attr}="[^"]*"`, 'g');
    result = result.replace(regex, `${attr}=${propValue}`);
  }

  return result;
}

/**
 * Convert SVG element to React component code
 */
export function convertSVGToComponent(svgElement: SVGSVGElement, options: ConversionOptions): string {
  const { propsInterface, propsDestructure, propsUsage } = generatePropTypes(options);

  // Convert SVG to JSX
  let jsxContent = elementToJSX(svgElement, 1);

  // Apply props if any
  if (Object.keys(propsUsage).length > 0) {
    jsxContent = applyPropsToSVG(jsxContent, propsUsage);
  }

  const isTsx = options.format === 'tsx';
  const exportType = 'export';

  // Generate component
  const hasProps = propsDestructure !== '';
  const functionParams = hasProps ? propsDestructure : '';

  const component = `${propsInterface}${exportType} function ${options.componentName}(${functionParams}) {
  return (
${jsxContent}
  );
}`;

  return component;
}

/**
 * Format component code using Prettier (basic formatting)
 */
export function formatCode(code: string): string {
  // Basic formatting - in a real implementation, we'd use Prettier API
  // For now, just ensure consistent spacing
  return code
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim() + '\n';
}
