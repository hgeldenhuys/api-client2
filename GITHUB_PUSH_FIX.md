# GitHub Push Fix - Large File Issue

## Problem
GitHub is rejecting pushes because of large proxy binary files (>100MB) in Git history:
- `proxy-server/dist/api-client-proxy-windows.exe` (111.97 MB)
- `proxy-server/dist/api-client-proxy-windows-baseline.exe` (111.56 MB)
- And several other large binaries

## Quick Solutions (Choose One)

### Option 1: Use Git LFS (Recommended for binaries you want to keep)
```bash
# Install Git LFS
git lfs install

# Track the large file types
git lfs track "*.exe"
git lfs track "**/proxy-server/dist/*"

# Add .gitattributes
git add .gitattributes
git commit -m "Add Git LFS tracking for binaries"

# Migrate existing large files to LFS
git lfs migrate import --include="*.exe" --include="**/proxy-server/dist/*"

# Push
git push origin main
```

### Option 2: Remove Large Files Completely (Recommended)
```bash
# Install git-filter-repo (more reliable than filter-branch)
brew install git-filter-repo

# Remove all files larger than 50MB from history
git filter-repo --strip-blobs-bigger-than 50M

# Force push (this rewrites history)
git push --force-with-lease origin main
```

### Option 3: Remove Specific Files
```bash
# Remove specific large files from history
git filter-repo --path 'proxy-server/dist/' --invert-paths
git filter-repo --path-glob '*proxy*.exe' --invert-paths
git filter-repo --path-glob '*proxy*-linux*' --invert-paths
git filter-repo --path-glob '*proxy*-macos*' --invert-paths

# Force push
git push --force-with-lease origin main
```

### Option 4: Fresh Start (Nuclear Option)
```bash
# Create a new repo without large files
mkdir ../api-client-clean
cd ../api-client-clean
git init
git remote add origin https://github.com/hgeldenhuys/api-client.git

# Copy everything except large files
rsync -av --exclude='proxy-server/dist' --exclude='.git' ../api-client/ .

# Initial commit
git add .
git commit -m "Clean repository without large binaries"
git push --force-with-lease origin main
```

## Automated Script
Run the fix script I created:
```bash
bun run scripts/fix-git-push.ts
```

## Prevention
The `.gitignore` has been updated to prevent future large file commits:
```
# Proxy server binaries (too large for GitHub)
proxy-server/dist/
**/proxy-server/dist/
**/*proxy*
**/api-client-proxy*
```

## Recommendation
Use **Option 2** (git-filter-repo to remove large files) since proxy binaries can be rebuilt and don't need to be in version control.