# TokenTally - Suggested Commands

## Development Workflow

### Start Development Server
```bash
npm run dev
```
- Starts Vite dev server on http://localhost:5173
- Hot module replacement (HMR) enabled
- Fast refresh for React components

### Build for Production
```bash
npm run build
```
- Runs TypeScript compiler (`tsc`) first
- Then runs Vite build
- Output: `dist/` directory
- Includes source maps for debugging

### Preview Production Build
```bash
npm run preview
```
- Serves the production build locally
- Test optimizations before deployment
- Verify that build works correctly

### Lint Code
```bash
npm run lint
```
- Runs ESLint on all TypeScript files
- Checks .ts and .tsx files
- Reports unused disable directives
- Fails if max-warnings (0) exceeded

### Type Check (Manual)
```bash
npx tsc --noEmit
```
- Run TypeScript compiler in check-only mode
- No files emitted (Vite handles building)
- Useful for CI/CD type validation

### Install Dependencies
```bash
npm install
```
- Installs all dependencies from package.json
- Run after cloning repo or pulling changes
- Uses exact versions (no ^ or ~)

### Security Audit
```bash
npm audit
```
- Check for known vulnerabilities in dependencies
- Run before releases
- Address high/critical vulnerabilities immediately

## System Commands (macOS/Darwin)

### File Navigation
```bash
ls -la                  # List files with details
cd path/to/directory    # Change directory
pwd                     # Print working directory
```

### File Operations
```bash
cat file.txt            # Display file contents
grep "pattern" file.txt # Search for pattern in file
find . -name "*.ts"     # Find files by name pattern
```

### Git Operations
```bash
git status              # Check repository status
git add .               # Stage all changes
git commit -m "msg"     # Commit with message
git push                # Push to remote
git pull                # Pull from remote
git branch              # List branches
git checkout -b name    # Create and switch to new branch
```

## Project-Specific Commands

### Update Pricing Data
1. Edit `src/config/pricingData.ts`
2. Update `LLM_PRICING` object
3. Update `lastUpdated` field
4. Document source in comments
5. Run `npm run lint` to validate
6. Test calculations manually

### Deploy to Vercel/Netlify
```bash
npm run build           # Create production build
# Upload dist/ folder to hosting provider
# or use CLI tools (vercel, netlify)
```

## Quick Reference

**Dev**: `npm run dev`  
**Build**: `npm run build`  
**Lint**: `npm run lint`  
**Type Check**: `npx tsc --noEmit`  
**Security**: `npm audit`