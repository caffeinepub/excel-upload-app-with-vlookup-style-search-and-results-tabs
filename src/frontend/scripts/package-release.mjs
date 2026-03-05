#!/usr/bin/env node

/**
 * Release packaging script
 * Creates a deterministic ZIP package containing full source + prebuilt frontend
 */

import { createWriteStream, existsSync, mkdirSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, relative, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import { execSync } from 'child_process';
import { shouldIncludeFile } from './release-manifest.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');
const releaseDir = join(__dirname, '..', 'release');
const packageName = 'crystal-atlas-release';

console.log('🎁 Crystal Atlas Release Packager\n');

// Step 1: Build frontend
console.log('📦 Step 1: Building frontend production assets...');
try {
  execSync('npm run build:skip-bindings', {
    cwd: join(projectRoot, 'frontend'),
    stdio: 'inherit',
  });
  console.log('✅ Frontend build complete\n');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

// Step 2: Ensure release directory exists
console.log('📁 Step 2: Preparing release directory...');
if (!existsSync(releaseDir)) {
  mkdirSync(releaseDir, { recursive: true });
}
console.log('✅ Release directory ready\n');

// Step 3: Create ZIP archive
console.log('🗜️  Step 3: Creating ZIP package...');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const zipPath = join(releaseDir, `${packageName}-${timestamp}.zip`);
const output = createWriteStream(zipPath);
const archive = archiver('zip', {
  zlib: { level: 9 }, // Maximum compression
});

// Track progress
let fileCount = 0;

output.on('close', () => {
  const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`\n✅ Package created successfully!`);
  console.log(`📦 File: ${basename(zipPath)}`);
  console.log(`📊 Size: ${sizeInMB} MB`);
  console.log(`📄 Files: ${fileCount}`);
  console.log(`📍 Location: ${zipPath}\n`);
  console.log('🎉 Release package ready for distribution!');
});

archive.on('error', (err) => {
  console.error('❌ Archive error:', err);
  process.exit(1);
});

archive.on('warning', (err) => {
  if (err.code === 'ENOENT') {
    console.warn('⚠️  Warning:', err);
  } else {
    throw err;
  }
});

archive.pipe(output);

// Helper function to recursively add files
function addDirectoryToArchive(dirPath, archivePath = '') {
  const entries = readdirSync(dirPath);
  
  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const relativePath = relative(projectRoot, fullPath);
    const archiveEntryPath = archivePath ? join(archivePath, entry) : entry;
    
    // Check if file should be included
    if (!shouldIncludeFile(relativePath)) {
      continue;
    }
    
    const stats = statSync(fullPath);
    
    if (stats.isDirectory()) {
      addDirectoryToArchive(fullPath, archiveEntryPath);
    } else if (stats.isFile()) {
      // Use deterministic date for reproducibility
      archive.append(readFileSync(fullPath), {
        name: archiveEntryPath,
        date: new Date('2026-01-01T00:00:00Z'),
        mode: stats.mode,
      });
      fileCount++;
      
      // Show progress every 50 files
      if (fileCount % 50 === 0) {
        process.stdout.write(`\r   Added ${fileCount} files...`);
      }
    }
  }
}

// Add project files
console.log('   Adding source files...');
addDirectoryToArchive(projectRoot);

// Add built frontend assets
const frontendDistPath = join(projectRoot, 'frontend', 'dist');
if (existsSync(frontendDistPath)) {
  console.log('\n   Adding built frontend assets...');
  const distEntries = readdirSync(frontendDistPath);
  
  for (const entry of distEntries) {
    const fullPath = join(frontendDistPath, entry);
    const stats = statSync(fullPath);
    
    if (stats.isDirectory()) {
      archive.directory(fullPath, `frontend/dist/${entry}`, {
        date: new Date('2026-01-01T00:00:00Z'),
      });
    } else {
      archive.file(fullPath, {
        name: `frontend/dist/${entry}`,
        date: new Date('2026-01-01T00:00:00Z'),
      });
    }
    fileCount++;
  }
}

// Finalize archive
archive.finalize();
