import fs from 'fs';
import path from 'path';

const sourcePath = path.resolve('src/ui/styles.css');
const outputPath = path.resolve('dist/style.css');

if (!fs.existsSync(sourcePath)) {
  console.error('CSS file not found:', sourcePath);
  process.exit(1);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.copyFileSync(sourcePath, outputPath);
console.log('Successfully copied styles to:', outputPath);
