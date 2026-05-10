import fs from 'fs';
import path from 'path';

const cssPath = path.resolve('dist/style.css');
if (!fs.existsSync(cssPath)) {
  console.error('CSS file not found:', cssPath);
  process.exit(1);
}

const cssContent = fs.readFileSync(cssPath, 'utf8');

const tsContent = `// This file is auto-generated. Do not edit manually.
export const CSS_CONTENT = ${JSON.stringify(cssContent)};

export const injectStyles = () => {
  if (typeof document === 'undefined') return;
  const id = 'snk-wallet-kit-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = CSS_CONTENT;
  document.head.appendChild(style);
};
`;

const outputPath = path.resolve('src/ui/generated-styles.ts');
fs.writeFileSync(outputPath, tsContent);
console.log('Successfully generated styles at:', outputPath);
