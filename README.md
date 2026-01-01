# SVG to Component Converter

A Chrome extension that inspects SVG content on websites and converts them to TSX or JSX React components with customizable props.

## Features

- **Automatic SVG Detection**: Automatically detects all inline and external SVG elements on any webpage
- **Visual Overlay**: Highlights detected SVGs with an interactive overlay for easy selection
- **Smart Conversion**: Converts SVG elements to properly formatted React components
- **Format Options**: Choose between TypeScript (.tsx) or JavaScript (.jsx) output
- **SVG Optimization**: Built-in SVGO integration to clean and optimize SVG code
- **Customizable Props**: Add configurable props for width, height, className, and color
- **Copy & Download**: Copy generated code to clipboard or download as a file
- **External SVG Support**: Handles both inline SVG elements and external SVG files

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/svg-component.git
   cd svg-component
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

### Development Mode

For development with auto-rebuild on file changes:

```bash
npm run dev
```

Then load the `dist` folder as an unpacked extension in Chrome.

## Usage

1. **Navigate to any webpage** with SVG content

2. **Click the extension icon** in your toolbar
   - The badge will show the number of SVGs detected on the page

3. **Show SVG Overlay**
   - Click "Show SVG Overlay" to highlight all SVGs on the page
   - Each SVG will be outlined with a blue border and numbered

4. **Select an SVG**
   - Click on any highlighted SVG or select from the list in the popup
   - The conversion panel will open

5. **Configure the component**
   - Enter a component name
   - Choose between TSX or JSX format
   - Enable/disable SVG optimization
   - Select which props to add (width, height, className, color)

6. **Convert**
   - Click "Convert" to generate the React component
   - Preview the generated code

7. **Export**
   - Click "Copy" to copy the code to your clipboard
   - Click "Download" to save as a .tsx or .jsx file

## Example Output

### Input SVG
```html
<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
</svg>
```

### Output TSX Component
```tsx
interface MyIconProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  color?: string;
}

export function MyIcon({ width = 24, height = 24, className, color = "currentColor" }: MyIconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2L2 7L12 12L22 7L12 2Z" fill={color} />
    </svg>
  );
}
```

## Project Structure

```
svg-component/
├── src/
│   ├── content/          # Content script (SVG detection & overlay)
│   │   ├── content.ts
│   │   └── content.css
│   ├── popup/            # Extension popup UI
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── popup.css
│   ├── background/       # Background service worker
│   │   └── background.ts
│   ├── utils/            # Utility functions
│   │   ├── svgConverter.ts
│   │   └── svgOptimizer.ts
│   └── types/            # TypeScript type definitions
│       └── messages.ts
├── public/
│   ├── manifest.json     # Extension manifest
│   └── icons/            # Extension icons
├── dist/                 # Build output (generated)
├── webpack.config.js     # Webpack configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Project dependencies
```

## Technologies Used

- **TypeScript**: Type-safe development
- **Webpack**: Module bundling
- **SVGO**: SVG optimization
- **Chrome Extension APIs**: Manifest V3
- **Prettier**: Code formatting (for generated components)

## Development

### Scripts

- `npm run dev` - Build in development mode with watch
- `npm run build` - Build for production
- `npm run type-check` - Run TypeScript type checking

### Adding Features

The extension is modular and easy to extend:

- **Add new conversion options**: Modify `src/utils/svgConverter.ts`
- **Customize SVG optimization**: Edit `src/utils/svgOptimizer.ts`
- **Enhance UI**: Update files in `src/popup/`
- **Add new detection logic**: Modify `src/content/content.ts`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- [SVGO](https://github.com/svg/svgo) for SVG optimization
- Chrome Extensions team for the excellent APIs
