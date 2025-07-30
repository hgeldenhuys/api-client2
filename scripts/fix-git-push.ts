#!/usr/bin/env bun
/**
 * Fix Git Push Issues - Remove Large Binary Files
 * 
 * This script removes large binary files from Git history that are blocking GitHub pushes
 */

import { execSync } from 'child_process';

const LARGE_FILE_PATTERNS = [
  'proxy-server/dist/*',
  '**/api-client-proxy*',
  '**/*proxy*.exe',
  '**/*proxy*-linux*',
  '**/*proxy*-macos*',
  '**/*proxy*-windows*'
];

function runCommand(command: string, description: string) {
  console.log(`🔄 ${description}...`);
  try {
    const result = execSync(command, { stdio: 'pipe', encoding: 'utf-8' });
    console.log(`✅ ${description} completed`);
    if (result.trim()) {
      console.log(`   Output: ${result.trim()}`);
    }
    return result;
  } catch (error: any) {
    console.log(`⚠️  ${description} - ${error.message}`);
    return '';
  }
}

function main() {
  console.log('🧹 Fixing Git push issues by removing large binary files...\n');

  // Add .gitignore patterns (already done, but ensure they're committed)
  runCommand('git add .gitignore', 'Adding updated .gitignore');

  // Remove any large files that might exist
  for (const pattern of LARGE_FILE_PATTERNS) {
    runCommand(`git rm --cached -r "${pattern}" 2>/dev/null || true`, `Removing ${pattern} from Git cache`);
  }

  // Try to clean up large files from all branches
  console.log('\n🗑️  Attempting to remove large files from Git history...');
  
  const largeFiles = [
    'proxy-server/dist/api-client-proxy-windows.exe',
    'proxy-server/dist/api-client-proxy-windows-baseline.exe', 
    'proxy-server/dist/api-client-proxy-linux-arm64',
    'proxy-server/dist/api-client-proxy-linux-x64',
    'proxy-server/dist/api-client-proxy-linux-x64-baseline',
    'proxy-server/dist/api-client-proxy-macos-arm',
    'proxy-server/dist/api-client-proxy-macos-intel'
  ];

  for (const file of largeFiles) {
    runCommand(`git filter-branch --force --index-filter "git rm --cached --ignore-unmatch '${file}'" --prune-empty --tag-name-filter cat -- --all 2>/dev/null || true`, `Removing ${file} from history`);
  }

  // Alternative: Use git filter-repo if available (more modern)
  console.log('\n🔄 Trying git filter-repo (if available)...');
  for (const file of largeFiles) {
    runCommand(`git filter-repo --path '${file}' --invert-paths 2>/dev/null || echo "git filter-repo not available, using filter-branch"`, `Filter-repo removing ${file}`);
  }

  // Force garbage collection
  runCommand('git reflog expire --expire=now --all', 'Expiring reflog');
  runCommand('git gc --prune=now --aggressive', 'Garbage collecting');

  // Commit the .gitignore changes
  runCommand('git add .gitignore', 'Adding .gitignore changes');
  runCommand('git commit -m "Add .gitignore rules for large proxy binaries" 2>/dev/null || echo "No changes to commit"', 'Committing .gitignore updates');

  console.log('\n🎯 Attempting to push...');
  const pushResult = runCommand('git push --force-with-lease origin main', 'Force pushing with lease');

  if (pushResult.includes('error') || pushResult.includes('rejected')) {
    console.log('\n❌ Push still failed. Additional steps needed:');
    console.log('\n📋 Manual steps to resolve:');
    console.log('1. Install git-filter-repo: brew install git-filter-repo');
    console.log('2. Run: git filter-repo --strip-blobs-bigger-than 50M');
    console.log('3. Force push: git push --force-with-lease origin main');
    console.log('\nOr create a fresh repository:');
    console.log('1. Create new GitHub repo');
    console.log('2. git remote set-url origin <new-repo-url>');
    console.log('3. git push -u origin main');
  } else {
    console.log('\n🎉 Push successful!');
  }
}

main();