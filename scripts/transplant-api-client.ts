#!/usr/bin/env bun
/**
 * API Client Transplant Script
 * 
 * This script transplants the API Client functionality into another React Router app.
 * It copies all necessary files, installs dependencies, and generates configuration TODOs.
 * 
 * Usage: bun run scripts/transplant-api-client.ts <target-directory>
 */

import { readdir, stat, mkdir, copyFile, readFile, writeFile, access } from 'fs/promises';
import { join, relative, dirname, basename } from 'path';
import { execSync } from 'child_process';

interface TransplantConfig {
  sourceDir: string;
  targetDir: string;
  preserveRoutes: boolean;
  generateTodos: boolean;
}

interface FileMapping {
  source: string;
  target: string;
  required: boolean;
  description: string;
}

interface PackageDependency {
  name: string;
  version: string;
  dev: boolean;
  description: string;
}

// Required dependencies for API Client
const REQUIRED_DEPENDENCIES: PackageDependency[] = [
  // Core React/Router (assumed to exist)
  { name: '@monaco-editor/react', version: '^4.7.0', dev: false, description: 'Monaco Editor for code editing' },
  
  // Radix UI components
  { name: '@radix-ui/react-alert-dialog', version: '^1.1.14', dev: false, description: 'Alert dialogs' },
  { name: '@radix-ui/react-dialog', version: '^1.1.14', dev: false, description: 'Modal dialogs' },
  { name: '@radix-ui/react-dropdown-menu', version: '^2.1.15', dev: false, description: 'Dropdown menus' },
  { name: '@radix-ui/react-label', version: '^2.1.7', dev: false, description: 'Form labels' },
  { name: '@radix-ui/react-radio-group', version: '^1.3.7', dev: false, description: 'Radio button groups' },
  { name: '@radix-ui/react-select', version: '^2.2.5', dev: false, description: 'Select dropdowns' },
  { name: '@radix-ui/react-slot', version: '^1.2.3', dev: false, description: 'Component composition' },
  { name: '@radix-ui/react-tabs', version: '^1.1.12', dev: false, description: 'Tab components' },
  { name: '@radix-ui/react-tooltip', version: '^1.2.7', dev: false, description: 'Tooltips' },
  
  // State management & utilities
  { name: 'zustand', version: '^5.0.6', dev: false, description: 'State management' },
  { name: 'immer', version: '^10.1.1', dev: false, description: 'Immutable state updates' },
  { name: 'idb', version: '^8.0.3', dev: false, description: 'IndexedDB wrapper' },
  
  // UI & Styling
  { name: 'lucide-react', version: '^0.532.0', dev: false, description: 'Icon library' },
  { name: 'class-variance-authority', version: '^0.7.1', dev: false, description: 'Variant utilities' },
  { name: 'clsx', version: '^2.1.1', dev: false, description: 'Conditional classes' },
  { name: 'tailwind-merge', version: '^3.3.1', dev: false, description: 'Tailwind class merging' },
  { name: 'react-resizable-panels', version: '^3.0.3', dev: false, description: 'Resizable panels' },
  
  // Code & Markdown
  { name: 'monaco-editor', version: '^0.52.2', dev: false, description: 'Monaco Editor core' },
  { name: 'prismjs', version: '^1.30.0', dev: false, description: 'Syntax highlighting' },
  { name: 'react-markdown', version: '^10.1.0', dev: false, description: 'Markdown rendering' },
  { name: 'react-syntax-highlighter', version: '^15.6.1', dev: false, description: 'Syntax highlighting component' },
  
  // Utilities
  { name: 'fast-json-patch', version: '^3.1.1', dev: false, description: 'JSON patch operations' },
  { name: 'eventsource', version: '^4.0.0', dev: false, description: 'Server-sent events' },
  
  // Dev dependencies
  { name: 'vite-plugin-monaco-editor', version: '^1.1.0', dev: true, description: 'Monaco Editor Vite plugin' },
  { name: '@types/prismjs', version: '^1.26.5', dev: true, description: 'Prism.js type definitions' },
  { name: '@types/react-syntax-highlighter', version: '^15.5.13', dev: true, description: 'React syntax highlighter types' },
  { name: '@types/json-patch', version: '^0.0.33', dev: true, description: 'JSON patch type definitions' },
];

// Files and directories to copy
const FILE_MAPPINGS: FileMapping[] = [
  // Core app structure
  { source: 'app/components', target: 'app/api-client/components', required: true, description: 'All React components' },
  { source: 'app/hooks', target: 'app/api-client/hooks', required: true, description: 'Custom React hooks' },
  { source: 'app/services', target: 'app/api-client/services', required: true, description: 'Business logic services' },
  { source: 'app/stores', target: 'app/api-client/stores', required: true, description: 'Zustand state stores' },
  { source: 'app/types', target: 'app/api-client/types', required: true, description: 'TypeScript type definitions' },
  { source: 'app/utils', target: 'app/api-client/utils', required: true, description: 'Utility functions' },
  { source: 'app/workers', target: 'app/api-client/workers', required: true, description: 'Web workers for script execution' },
  
  // Assets
  { source: 'app/welcome', target: 'app/api-client/assets', required: false, description: 'Logo and welcome assets' },
  
  // Configuration examples
  { source: 'app/app.css', target: 'app/api-client-styles.css', required: false, description: 'API Client specific styles' },
];

// Route files to copy (optional)
const ROUTE_MAPPINGS: FileMapping[] = [
  { source: 'app/routes/api-client._index.tsx', target: 'app/routes/api-client._index.tsx', required: false, description: 'Main API Client route' },
  { source: 'app/routes/api-client.api.theme.tsx', target: 'app/routes/api-client.api.theme.tsx', required: false, description: 'Theme API route' },
];

class ApiClientTransplanter {
  private config: TransplantConfig;
  private todos: string[] = [];
  private copiedFiles: string[] = [];
  private errors: string[] = [];

  constructor(config: TransplantConfig) {
    this.config = config;
  }

  async run(): Promise<void> {
    console.log('🚀 Starting API Client transplant...');
    console.log(`📁 Source: ${this.config.sourceDir}`);
    console.log(`🎯 Target: ${this.config.targetDir}`);
    console.log();

    try {
      await this.validateDirectories();
      await this.copyFiles();
      await this.installDependencies();
      await this.generateConfigurationTodos();
      await this.generateSummaryReport();
    } catch (error) {
      console.error('❌ Transplant failed:', error);
      process.exit(1);
    }
  }

  private async validateDirectories(): Promise<void> {
    console.log('🔍 Validating directories...');
    
    // Check source directory
    try {
      await access(this.config.sourceDir);
      await access(join(this.config.sourceDir, 'app'));
    } catch {
      throw new Error(`Source directory not found or invalid: ${this.config.sourceDir}`);
    }

    // Check target directory
    try {
      await access(this.config.targetDir);
      const packageJsonPath = join(this.config.targetDir, 'package.json');
      await access(packageJsonPath);
    } catch {
      throw new Error(`Target directory not found or not a Node.js project: ${this.config.targetDir}`);
    }

    console.log('✅ Directories validated');
  }

  private async copyFiles(): Promise<void> {
    console.log('📋 Copying API Client files...');

    // Copy core files
    for (const mapping of FILE_MAPPINGS) {
      await this.copyPath(mapping);
    }

    // Copy routes if requested
    if (this.config.preserveRoutes) {
      for (const mapping of ROUTE_MAPPINGS) {
        await this.copyPath(mapping);
      }
    }

    console.log(`✅ Copied ${this.copiedFiles.length} files/directories`);
  }

  private async copyPath(mapping: FileMapping): Promise<void> {
    const sourcePath = join(this.config.sourceDir, mapping.source);
    const targetPath = join(this.config.targetDir, mapping.target);

    try {
      const sourceStats = await stat(sourcePath);
      
      if (sourceStats.isDirectory()) {
        await this.copyDirectory(sourcePath, targetPath);
      } else {
        await this.copyFileWithDirs(sourcePath, targetPath);
      }
      
      this.copiedFiles.push(mapping.target);
      console.log(`  ✓ ${mapping.source} → ${mapping.target}`);
    } catch (error) {
      const message = `Failed to copy ${mapping.source}: ${error}`;
      if (mapping.required) {
        this.errors.push(message);
      } else {
        console.log(`  ⚠️  Optional: ${message}`);
      }
    }
  }

  private async copyDirectory(source: string, target: string): Promise<void> {
    await mkdir(target, { recursive: true });
    
    const entries = await readdir(source);
    
    for (const entry of entries) {
      const sourcePath = join(source, entry);
      const targetPath = join(target, entry);
      const stats = await stat(sourcePath);
      
      if (stats.isDirectory()) {
        await this.copyDirectory(sourcePath, targetPath);
      } else {
        await copyFile(sourcePath, targetPath);
      }
    }
  }

  private async copyFileWithDirs(source: string, target: string): Promise<void> {
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
  }

  private async installDependencies(): Promise<void> {
    console.log('📦 Installing dependencies...');
    
    const packageJsonPath = join(this.config.targetDir, 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
    
    let installed = 0;
    let skipped = 0;

    for (const dep of REQUIRED_DEPENDENCIES) {
      const existingVersion = dep.dev 
        ? packageJson.devDependencies?.[dep.name]
        : packageJson.dependencies?.[dep.name];

      if (existingVersion) {
        console.log(`  ⏭️  ${dep.name} already installed (${existingVersion})`);
        skipped++;
        continue;
      }

      try {
        const depType = dep.dev ? '--dev' : '';
        execSync(`cd "${this.config.targetDir}" && bun add ${depType} ${dep.name}@${dep.version}`, {
          stdio: 'pipe'
        });
        console.log(`  ✓ Installed ${dep.name}@${dep.version}`);
        installed++;
      } catch (error) {
        console.log(`  ❌ Failed to install ${dep.name}: ${error}`);
        this.todos.push(`INSTALL: Add ${dep.name}@${dep.version} ${dep.dev ? '(dev)' : ''} - ${dep.description}`);
      }
    }

    console.log(`✅ Dependencies: ${installed} installed, ${skipped} skipped`);
  }

  private async generateConfigurationTodos(): Promise<void> {
    console.log('📝 Generating configuration TODOs...');

    // Vite configuration
    this.todos.push('');
    this.todos.push('=== VITE CONFIGURATION ===');
    this.todos.push('Add to vite.config.ts plugins array:');
    this.todos.push('```typescript');
    this.todos.push('import monacoEditorPlugin from "vite-plugin-monaco-editor";');
    this.todos.push('');
    this.todos.push('export default defineConfig({');
    this.todos.push('  plugins: [');
    this.todos.push('    // ... your existing plugins');
    this.todos.push('    monacoEditorPlugin.default({');
    this.todos.push('      languageWorkers: ["editorWorkerService", "typescript", "json", "html", "css"]');
    this.todos.push('    })');
    this.todos.push('  ],');
    this.todos.push('});');
    this.todos.push('```');

    // TypeScript configuration
    this.todos.push('');
    this.todos.push('=== TYPESCRIPT CONFIGURATION ===');
    this.todos.push('Add to tsconfig.json paths:');
    this.todos.push('```json');
    this.todos.push('{');
    this.todos.push('  "compilerOptions": {');
    this.todos.push('    "paths": {');
    this.todos.push('      "~/api-client/*": ["./app/api-client/*"]');
    this.todos.push('    }');
    this.todos.push('  }');
    this.todos.push('}');
    this.todos.push('```');

    // Route integration
    this.todos.push('');
    this.todos.push('=== ROUTE INTEGRATION ===');
    this.todos.push('Create a route file (e.g., app/routes/api-client.tsx) with:');
    this.todos.push('```typescript');
    this.todos.push('import { ApiClientProvider } from "~/api-client/components/ConfigProvider";');
    this.todos.push('import { CollectionView } from "~/api-client/components/views/CollectionView";');
    this.todos.push('import { MainLayout } from "~/api-client/components/layout/MainLayout";');
    this.todos.push('');
    this.todos.push('export default function ApiClientRoute() {');
    this.todos.push('  return (');
    this.todos.push('    <ApiClientProvider>');
    this.todos.push('      <MainLayout>');
    this.todos.push('        <CollectionView />');
    this.todos.push('      </MainLayout>');
    this.todos.push('    </ApiClientProvider>');
    this.todos.push('  );');
    this.todos.push('}');
    this.todos.push('```');

    // Styling
    this.todos.push('');
    this.todos.push('=== STYLING ===');
    if (this.copiedFiles.includes('app/api-client-styles.css')) {
      this.todos.push('Import API Client styles in your root component:');
      this.todos.push('```typescript');
      this.todos.push('import "./api-client-styles.css";');
      this.todos.push('```');
    }
    this.todos.push('Ensure Tailwind CSS is configured and includes API Client paths:');
    this.todos.push('```javascript');
    this.todos.push('// tailwind.config.js');
    this.todos.push('module.exports = {');
    this.todos.push('  content: [');
    this.todos.push('    "./app/**/*.{js,ts,jsx,tsx}",');
    this.todos.push('    "./app/api-client/**/*.{js,ts,jsx,tsx}"');
    this.todos.push('  ],');
    this.todos.push('  // ... rest of config');
    this.todos.push('};');
    this.todos.push('```');

    // Configuration
    this.todos.push('');
    this.todos.push('=== API CLIENT CONFIGURATION ===');
    this.todos.push('Configure the API Client by wrapping your components with ConfigProvider:');
    this.todos.push('```typescript');
    this.todos.push('import { ApiClientProvider } from "~/api-client/components/ConfigProvider";');
    this.todos.push('');
    this.todos.push('const config = {');
    this.todos.push('  github: {');
    this.todos.push('    label: "View on GitHub",');
    this.todos.push('    url: "https://github.com/yourorg/yourrepo"');
    this.todos.push('  },');
    this.todos.push('  support: {');
    this.todos.push('    email: "support@yourapp.com"');
    this.todos.push('  },');
    this.todos.push('  branding: {');
    this.todos.push('    logo: <YourLogo />,');
    this.todos.push('    logoLink: "/"');
    this.todos.push('  }');
    this.todos.push('};');
    this.todos.push('');
    this.todos.push('<ApiClientProvider config={config}>');
    this.todos.push('  {/* Your API Client components */}');
    this.todos.push('</ApiClientProvider>');
    this.todos.push('```');

    // Security considerations
    this.todos.push('');
    this.todos.push('=== SECURITY CONSIDERATIONS ===');
    this.todos.push('- Review storage encryption settings in services/storage/');
    this.todos.push('- Configure CORS policies for API requests');
    this.todos.push('- Set up Content Security Policy for Monaco Editor');
    this.todos.push('- Review script execution security in workers/scriptWorker.ts');

    console.log('✅ Configuration TODOs generated');
  }

  private async generateSummaryReport(): Promise<void> {
    const todoFile = join(this.config.targetDir, 'API_CLIENT_SETUP_TODOS.md');
    
    const report = [
      '# API Client Setup TODOs',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Source: ${this.config.sourceDir}`,
      `Target: ${this.config.targetDir}`,
      '',
      '## Summary',
      `- ✅ Copied ${this.copiedFiles.length} files/directories`,
      `- 📦 Dependencies to install: ${REQUIRED_DEPENDENCIES.length}`,
      `- ⚠️  Errors: ${this.errors.length}`,
      '',
      ...this.errors.length > 0 ? [
        '## Errors',
        ...this.errors.map(error => `- ❌ ${error}`),
        ''
      ] : [],
      '## Configuration Tasks',
      ...this.todos,
      '',
      '## Next Steps',
      '1. Complete the configuration tasks above',
      '2. Test the integration by visiting your API Client route',
      '3. Customize the configuration and branding as needed',
      '4. Review security settings and adjust for your environment',
      '',
      '## Files Copied',
      ...this.copiedFiles.map(file => `- ${file}`),
    ].join('\n');

    await writeFile(todoFile, report);
    
    console.log();
    console.log('🎉 Transplant completed!');
    console.log(`📄 Setup instructions: ${todoFile}`);
    console.log();
    
    if (this.errors.length > 0) {
      console.log('⚠️  Some errors occurred. Check the TODO file for details.');
    } else {
      console.log('✅ All files copied successfully!');
    }
  }
}

// Main execution
async function main() {
  const targetDir = process.argv[2];
  
  if (!targetDir) {
    console.error('Usage: bun run scripts/transplant-api-client.ts <target-directory>');
    console.error('');
    console.error('Example: bun run scripts/transplant-api-client.ts ../my-app');
    process.exit(1);
  }

  const sourceDir = process.cwd(); // Current API Client directory
  
  const config: TransplantConfig = {
    sourceDir,
    targetDir: targetDir.startsWith('/') ? targetDir : join(process.cwd(), '..', targetDir),
    preserveRoutes: true, // Copy route examples
    generateTodos: true,
  };

  const transplanter = new ApiClientTransplanter(config);
  await transplanter.run();
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}