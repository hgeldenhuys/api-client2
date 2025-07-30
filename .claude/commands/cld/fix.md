# Fix

Fix code compilation, linting, and formatting issues by running appropriate tools and addressing detected problems.

## Implementation Steps

When executing this command, follow these steps in order:

1. **Identify the scope**:
   - Single file: `@file_name`
   - Directory: `@folder_name`
   - Current directory: no argument

2. **Run diagnostic tools** (check for existence first):
   - **Linting**: Run `npm run lint` or `bun run lint` (check package.json for the exact script)
   - **TypeScript**: Run `tsc --noEmit` if TypeScript is used
   - **Formatting**: Run `npm run format` or `bun run format` if available
   - **Other tools**: Check package.json scripts for other quality checks

3. **Analyze the output**:
   - Parse error messages and warnings
   - Identify file paths and line numbers
   - Categorize issues (ESLint, TypeScript, formatting, etc.)

4. **Apply fixes**:
   - Be sure to use type-safety and correctness when applying fixes
   - For auto-fixable issues: Run tools with `--fix` flag (e.g., `npm run lint -- --fix`)
   - For manual fixes: Edit the files to resolve specific issues
   - Common fixes:
     - Remove unused variables/imports
     - Add missing type annotations
     - Fix formatting issues
     - Resolve TypeScript errors
     - Add missing semicolons or trailing commas

5. **Verify fixes**:
   - Re-run the diagnostic tools
   - Confirm all issues are resolved
   - Report any issues that couldn't be fixed automatically

## Usage Examples

### Usage 1: Fix a specific file
```
/cld:fix @src/components/Button.tsx
```
The agent will run linting and type checking on the specified file and fix all detected issues.

### Usage 2: Fix all files in a directory
```
/cld:fix @src/components
```
The agent will recursively check and fix all code files in the specified folder.

### Usage 3: Fix all files in the project
```
/cld:fix
```
Fix all code files in the current working directory based on the project's configuration.

## Important Notes

- Always check `package.json` for available scripts before running commands
- Prefer `bun` over `npm` when available
- If no lint/format scripts exist, check for config files (.eslintrc, .prettierrc, tsconfig.json)
- Report which issues were fixed and which require manual intervention
- Some ESLint rules may conflict with Prettier - prioritize Prettier for formatting