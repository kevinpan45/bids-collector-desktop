#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildDir = join(__dirname, 'build');

function fixPaths(filePath) {
  console.log(`Fixing paths in: ${filePath}`);
  let content = readFileSync(filePath, 'utf8');
  
  // Replace absolute paths with relative paths, but preserve source paths (starting with /src)
  content = content.replace(/href="\/(?!http|src)/g, 'href="./');
  content = content.replace(/src="\/(?!http|src)/g, 'src="./');
  content = content.replace(/url\(\/(?!http|src)/g, 'url(./');
  
  // Fix general quoted paths but preserve source paths
  content = content.replace(/"\/(?!http|src)([^"]*)/g, '"./$1');
  
  // Fix template literals with _app paths (e.g., `${Yt}/_app/version.json`)
  content = content.replace(/(\$\{[^}]+\})\/(_app\/[^`"']+)/g, '$1./$2');
  
  // Fix module imports in JS files but preserve source imports
  content = content.replace(/from\s+["']\/(?!http|src)/g, 'from "./');
  content = content.replace(/import\s*\(\s*["']\/(?!http|src)/g, 'import("./');
  
  // Fix any remaining malformed paths that might have been created
  content = content.replace(/build\._app/g, 'build/_app');
  content = content.replace(/\.\/_app/g, './_app');
  
  // Fix fetch and navigation URLs
  content = content.replace(/fetch\s*\(\s*["']\/(?!http|src)/g, 'fetch("./');
  content = content.replace(/goto\s*\(\s*["']\/(?!http|src)/g, 'goto("./');
  
  writeFileSync(filePath, content);
}

function walkDir(dir) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.css')) {
      fixPaths(filePath);
    }
  }
}

console.log('Fixing absolute paths in build directory...');
walkDir(buildDir);
console.log('Path fixing complete!');
