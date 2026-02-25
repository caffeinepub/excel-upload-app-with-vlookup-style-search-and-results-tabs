/**
 * Release manifest - defines which files to include/exclude in the package
 */

export const includePatterns = [
  // Source files
  'frontend/src/**/*',
  'backend/**/*',
  
  // Configuration files
  'frontend/index.html',
  'frontend/tailwind.config.js',
  'frontend/tsconfig.json',
  'frontend/vite.config.js',
  'frontend/postcss.config.js',
  'frontend/components.json',
  'frontend/.env.example',
  
  // Assets
  'frontend/public/**/*',
  
  // Root configuration
  'dfx.json',
  'package.json',
  '.gitignore',
  'README.md',
  
  // Documentation
  'frontend/PACKAGING.md',
];

export const excludePatterns = [
  // Dependencies
  '**/node_modules/**',
  
  // Build outputs
  '**/dist/**',
  '**/build/**',
  '**/.dfx/**',
  
  // Cache and temp files
  '**/.cache/**',
  '**/.temp/**',
  '**/.tmp/**',
  '**/tmp/**',
  
  // IDE and OS files
  '**/.vscode/**',
  '**/.idea/**',
  '**/.DS_Store',
  '**/Thumbs.db',
  
  // Logs
  '**/*.log',
  '**/logs/**',
  
  // Environment files (keep .env.example)
  '**/.env',
  '**/.env.local',
  
  // Git
  '**/.git/**',
  '**/.gitattributes',
  
  // Release artifacts
  '**/release/**',
  '**/*.zip',
];

export function shouldIncludeFile(filePath) {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Check exclusions first
  for (const pattern of excludePatterns) {
    const regex = new RegExp(
      '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
    );
    if (regex.test(normalizedPath)) {
      return false;
    }
  }
  
  // Check inclusions
  for (const pattern of includePatterns) {
    const regex = new RegExp(
      '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
    );
    if (regex.test(normalizedPath)) {
      return true;
    }
  }
  
  return false;
}
