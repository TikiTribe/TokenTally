# TokenTally Deployment Guide

Comprehensive deployment documentation for deploying TokenTally to Vercel production environment.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Deployment Options](#deployment-options)
- [Method 1: GitHub Integration (Recommended)](#method-1-github-integration-recommended)
- [Method 2: Vercel CLI](#method-2-vercel-cli)
- [Method 3: Vercel Dashboard](#method-3-vercel-dashboard)
- [Post-Deployment Verification](#post-deployment-verification)
- [Configuration Reference](#configuration-reference)
- [Troubleshooting](#troubleshooting)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Rollback Procedure](#rollback-procedure)

---

## Prerequisites

Before deploying TokenTally, ensure you have:

### Required Tools
- **Node.js**: v20.11.0 (as specified in `.nvmrc`)
- **npm**: v10.0.0+ (included with Node.js)
- **Git**: v2.30.0+ (for version control)
- **Vercel Account**: Free account at [vercel.com](https://vercel.com)

### Project Requirements
- All dependencies installed (`npm install`)
- Production build successful (`npm run build`)
- All tests passing (if applicable)
- Clean git working directory (no uncommitted changes)

### Verification Commands
```bash
# Check Node.js version
node --version  # Should output: v20.11.0

# Check npm version
npm --version   # Should output: 10.x.x

# Verify build works locally
npm run build   # Should complete without errors
npm run preview # Test production build at http://localhost:4173
```

---

## Pre-Deployment Checklist

Complete this checklist before deploying to production:

### Security
- [ ] Run `npm audit` and resolve all vulnerabilities (Status: ✅ 0 vulnerabilities)
- [ ] Verify no API keys or secrets in source code
- [ ] Confirm security headers configured in `vercel.json`
- [ ] Test input validation with edge cases

### Quality Gates
- [ ] TypeScript compilation: 0 errors (`npm run build`)
- [ ] ESLint validation: 0 warnings (`npm run lint`)
- [ ] Manual testing: All features functional
- [ ] Export functionality: PDF and CSV downloads work

### Build Optimization
- [ ] Bundle size verified: 305 KB gzipped (Target: <500 KB) ✅
- [ ] Build time acceptable: ~1.6s
- [ ] No console.log statements in production code
- [ ] Dead code eliminated

### Configuration
- [ ] `vercel.json` present and valid
- [ ] `.nvmrc` specifies correct Node version (20.11.0)
- [ ] `package.json` has exact dependency versions (no `^` or `~`)

---

## Deployment Options

TokenTally supports three deployment methods to Vercel:

### Comparison Table

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **GitHub Integration** | Automatic deployments, preview URLs, CI/CD | Requires GitHub repo | Production teams |
| **Vercel CLI** | Fast, scriptable, local control | Manual process | Developers |
| **Dashboard Upload** | No CLI needed, visual interface | Slowest, no automation | Quick tests |

**Recommendation**: Use GitHub Integration for production deployments to enable automatic deployments on every commit and preview URLs for pull requests.

---

## Method 1: GitHub Integration (Recommended)

Automatic deployments with CI/CD pipeline integration.

### Step 1: Push to GitHub

```bash
# Initialize git repository (if not already done)
git init

# Add all files to staging
git add .

# Create initial commit
git commit -m "Initial commit: TokenTally production ready"

# Create GitHub repository (via GitHub website or CLI)
# Then add remote and push
git remote add origin https://github.com/YOUR_USERNAME/tokentally.git
git branch -M main
git push -u origin main
```

### Step 2: Connect to Vercel

1. **Log in to Vercel**
   - Navigate to [vercel.com](https://vercel.com)
   - Sign in with GitHub account

2. **Import Project**
   - Click **"Add New..."** → **"Project"**
   - Select **"Import Git Repository"**
   - Choose your `tokentally` repository
   - Click **"Import"**

3. **Configure Project**
   - **Project Name**: `tokentally` (or custom name)
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (auto-detected from `vercel.json`)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (default)

4. **Environment Variables**
   - TokenTally requires **NO environment variables** (fully client-side)
   - Leave this section empty
   - Click **"Deploy"**

### Step 3: Monitor Deployment

Vercel will automatically:
1. Clone your repository
2. Install dependencies (npm install)
3. Run build command (npm run build)
4. Deploy static assets to CDN
5. Assign production URL

**Expected Build Output:**
```
✓ Building...
✓ TypeScript compilation: 0 errors
✓ Bundle size: 305 KB gzipped (620 KB uncompressed)
✓ Build completed in 1.60s
✓ Deployment complete
```

### Step 4: Access Your Application

Vercel provides multiple URLs:

- **Production URL**: `https://tokentally.vercel.app` (auto-assigned)
- **Custom Domain**: Configure in Vercel dashboard (optional)
- **Preview URLs**: Automatic for pull requests

### Automatic Deployments

Once configured, Vercel will automatically:

- **Production Deployment**: Every push to `main` branch
- **Preview Deployment**: Every pull request
- **Rollback Support**: One-click rollback in dashboard

---

## Method 2: Vercel CLI

Fast deployment from local environment.

### Step 1: Install Vercel CLI

```bash
# Install globally
npm install -g vercel

# Verify installation
vercel --version  # Should output: Vercel CLI 33.x.x
```

### Step 2: Login to Vercel

```bash
# Authenticate with Vercel account
vercel login

# Follow browser authentication flow
# Returns to terminal after successful login
```

### Step 3: Deploy to Production

```bash
# Navigate to project directory
cd /Users/klambros/PycharmProjects/TokenTally

# Run production deployment
vercel --prod

# CLI will prompt for configuration:
# ? Set up and deploy? [Y/n] y
# ? Which scope? (select your account)
# ? Link to existing project? [y/N] n
# ? What's your project's name? tokentally
# ? In which directory is your code located? ./
```

**Expected Output:**
```
🔍 Inspect: https://vercel.com/your-account/tokentally/...
✅ Production: https://tokentally.vercel.app [1.6s]
```

### Step 4: Verify Deployment

```bash
# Open production URL in browser
vercel --prod --open

# View deployment logs
vercel logs tokentally
```

### Subsequent Deployments

After initial setup, deploy with a single command:

```bash
vercel --prod
```

---

## Method 3: Vercel Dashboard

Manual upload through web interface.

### Step 1: Build Locally

```bash
# Create production build
npm run build

# Verify dist/ folder created
ls -lh dist/
# Should show: index.html, assets/, and other static files
```

### Step 2: Upload via Dashboard

1. **Log in to Vercel**
   - Navigate to [vercel.com/new](https://vercel.com/new)

2. **Select Import Option**
   - Click **"Add New..."** → **"Project"**
   - Choose **"Deploy from .zip"** or **"Import existing project"**

3. **Upload Build**
   - Select your `dist/` folder
   - Or compress to ZIP: `zip -r tokentally-dist.zip dist/`
   - Upload ZIP file

4. **Configure Settings**
   - **Project Name**: `tokentally`
   - **Framework**: Vite
   - No environment variables needed

5. **Deploy**
   - Click **"Deploy"**
   - Wait for deployment to complete (30-60 seconds)

### Limitations

- **Manual Process**: No automatic deployments
- **No Git Integration**: No version history or rollback support
- **Best For**: Quick testing or one-time deployments

---

## Post-Deployment Verification

Complete testing checklist after successful deployment.

### Functional Testing

**Core Functionality:**
- [ ] Application loads without errors
- [ ] All 6 models appear in model selector dropdown
- [ ] Calculator displays default configuration
- [ ] Real-time updates work (<100ms on input change)
- [ ] Cost calculations match expected values (±5% accuracy)

**User Interactions:**
- [ ] Model selection updates calculations
- [ ] Input fields validate properly (min/max bounds)
- [ ] Context strategy selector changes results
- [ ] Volume slider updates monthly costs

**Export Features:**
- [ ] PDF export generates valid PDF file
- [ ] CSV export downloads correctly
- [ ] Both exports contain accurate data

**Visual Checks:**
- [ ] Responsive design works on mobile (375px width)
- [ ] Responsive design works on tablet (768px width)
- [ ] Responsive design works on desktop (1920px width)
- [ ] Charts render correctly (Recharts)
- [ ] Typography and spacing correct

### Performance Testing

**Load Time:**
```bash
# Test with Chrome DevTools
# Open: https://tokentally.vercel.app
# Check Network tab:
# - Initial load: <2s on 3G
# - Bundle size: 305 KB gzipped ✅
# - Time to Interactive: <3s
```

**Core Web Vitals:**
- **LCP** (Largest Contentful Paint): <2.5s ✅
- **FID** (First Input Delay): <100ms ✅
- **CLS** (Cumulative Layout Shift): <0.1 ✅

### Security Testing

**Security Headers:**
```bash
# Verify headers with curl
curl -I https://tokentally.vercel.app

# Should include:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: strict-origin-when-cross-origin
```

**Input Validation:**
- [ ] Negative numbers rejected
- [ ] NaN/Infinity handled gracefully
- [ ] Max bounds enforced (10M conversations/month)
- [ ] CSV exports don't execute formulas

### Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium): Latest version
- [ ] Firefox: Latest version
- [ ] Safari: Latest version (macOS/iOS)
- [ ] Mobile browsers: Chrome Mobile, Safari iOS

---

## Configuration Reference

Detailed explanation of `vercel.json` configuration.

### Build Settings

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite"
}
```

**Explanation:**
- **buildCommand**: Runs TypeScript compilation + Vite production build
- **outputDirectory**: Static files served from `dist/` folder
- **installCommand**: Installs exact dependency versions from package-lock.json
- **framework**: Auto-detects Vite configuration and optimizations

### SPA Routing

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Explanation:**
- Enables client-side routing for single-page application
- All routes (e.g., `/calculator`, `/export`) serve `index.html`
- React Router (if added later) can handle routing

### Security Headers

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

**Security Headers Applied:**

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-sniffing attacks |
| `X-Frame-Options` | `DENY` | Prevents clickjacking (no iframe embedding) |
| `X-XSS-Protection` | `1; mode=block` | Enables browser XSS protection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer information leakage |

### Cache Headers

```json
{
  "source": "/assets/(.*)",
  "headers": [
    {
      "key": "Cache-Control",
      "value": "public, max-age=31536000, immutable"
    }
  ]
}
```

**Explanation:**
- **Assets folder**: All JS/CSS/images in `/assets/` cached for 1 year
- **Immutable flag**: Files never change (Vite uses content hashes)
- **Performance benefit**: Reduces bandwidth and improves load times

---

## Troubleshooting

Common deployment issues and solutions.

### Build Failures

**Error: `TypeScript compilation failed`**

```bash
# Solution: Fix TypeScript errors locally first
npm run build

# Common causes:
# - Missing type definitions
# - Strict mode violations
# - Import path errors
```

**Error: `Module not found`**

```bash
# Solution: Verify dependencies installed
npm install

# Check package.json has all dependencies
# No missing imports in source code
```

**Error: `Build output exceeds size limit`**

```bash
# Current size: 305 KB (well under limit)
# If this occurs:
# - Remove unused dependencies
# - Enable code splitting
# - Optimize images (use WebP format)
```

### Deployment Failures

**Error: `Failed to deploy: Invalid vercel.json`**

```bash
# Solution: Validate JSON syntax
cat vercel.json | python -m json.tool

# Check for:
# - Missing commas
# - Trailing commas
# - Invalid property names
```

**Error: `Build command exited with 1`**

```bash
# Solution: Check Vercel build logs
vercel logs tokentally --follow

# Common causes:
# - Missing dependencies in package.json
# - Node version mismatch (.nvmrc not respected)
# - Build script errors
```

### Runtime Errors

**Error: `404 on page refresh`**

```bash
# Solution: Verify SPA rewrites configured
# Check vercel.json has rewrites section (see Configuration Reference)
```

**Error: `MIME type mismatch`**

```bash
# Solution: Verify security headers configured
# Check X-Content-Type-Options: nosniff header present
```

**Error: `Slow initial load`**

```bash
# Solution: Enable asset caching
# Verify Cache-Control headers on /assets/* (see Configuration Reference)
```

### Vercel CLI Issues

**Error: `vercel: command not found`**

```bash
# Solution: Install Vercel CLI globally
npm install -g vercel

# Verify installation
which vercel  # Should output: /usr/local/bin/vercel
```

**Error: `Authentication failed`**

```bash
# Solution: Re-authenticate
vercel logout
vercel login

# Follow browser authentication flow
```

---

## Monitoring & Maintenance

Post-deployment tasks and ongoing maintenance.

### Performance Monitoring

**Vercel Analytics** (Optional):

1. **Enable Analytics**
   - Navigate to Vercel dashboard → your project
   - Click **"Analytics"** tab
   - Enable free tier (100K page views/month)

2. **Metrics to Monitor**
   - Page load time (target: <2s)
   - Core Web Vitals (LCP, FID, CLS)
   - Geographic performance distribution

**Google Analytics** (Optional):

Add tracking code to `index.html` before deployment:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Security Monitoring

**Dependency Audits:**

```bash
# Run monthly security audits
npm audit

# Auto-fix vulnerabilities (test thoroughly after)
npm audit fix

# For critical vulnerabilities, update immediately
npm update <package-name>
```

**Vercel Security Headers:**

Periodically verify headers still present:

```bash
curl -I https://tokentally.vercel.app | grep -E "(X-Frame|X-Content|X-XSS|Referrer)"
```

### Pricing Updates

**Update Schedule**: Quarterly (or when providers announce changes)

1. **Check Official Sources**
   - OpenAI: https://openai.com/api/pricing/
   - Anthropic: https://www.anthropic.com/pricing

2. **Update `src/config/pricingData.ts`**
   - Modify pricing values
   - Update `lastUpdated` timestamp
   - Add comment documenting source

3. **Redeploy**
   - Commit changes to GitHub
   - Automatic deployment via GitHub integration
   - Or manual: `vercel --prod`

### Uptime Monitoring

**Recommended Tools** (Free tier sufficient):

- **UptimeRobot**: https://uptimerobot.com (50 monitors free)
- **Pingdom**: https://www.pingdom.com (free tier)
- **StatusCake**: https://www.statuscake.com (10 monitors free)

**Configuration:**
- **URL to Monitor**: https://tokentally.vercel.app
- **Check Interval**: 5 minutes
- **Alert Threshold**: 2 consecutive failures
- **Notification Method**: Email

---

## Rollback Procedure

Emergency recovery process for deployment failures.

### Instant Rollback (Vercel Dashboard)

**Fastest method** for immediate recovery:

1. **Access Deployments**
   - Navigate to Vercel dashboard
   - Select `tokentally` project
   - Click **"Deployments"** tab

2. **Identify Previous Deployment**
   - View list of all deployments (newest first)
   - Find last known-good deployment (marked with ✅)
   - Click **three-dot menu** → **"Promote to Production"**

3. **Confirm Rollback**
   - Review deployment details
   - Click **"Promote"**
   - Wait 10-30 seconds for DNS propagation

4. **Verify Rollback**
   - Visit production URL: https://tokentally.vercel.app
   - Confirm application works as expected
   - Check Vercel dashboard shows new production deployment

**Time to Recovery**: <1 minute

### Git Revert (GitHub Integration)

**Use when** rollback via dashboard unavailable or git history recovery needed:

```bash
# Step 1: Find problematic commit
git log --oneline
# Example output:
# abc1234 Fix: Update pricing data
# def5678 Feature: Add new model support  <- Rollback to this
# ghi9012 Initial deployment

# Step 2: Revert to previous commit
git revert abc1234

# Or hard reset (destructive, use with caution)
git reset --hard def5678

# Step 3: Force push to trigger deployment
git push origin main --force

# Step 4: Monitor Vercel deployment
# GitHub integration will automatically deploy reverted version
```

**Time to Recovery**: 2-3 minutes (includes build time)

### CLI Rollback (Vercel CLI)

```bash
# Step 1: List recent deployments
vercel ls tokentally

# Step 2: Identify deployment ID to promote
# Copy deployment URL from list

# Step 3: Promote specific deployment to production
vercel promote <deployment-url> --scope <your-account>

# Example:
# vercel promote tokentally-abc123.vercel.app --scope my-team
```

**Time to Recovery**: <1 minute

### Emergency Rollback Plan

**When to Rollback:**
- [ ] Critical functionality broken (calculator errors, exports fail)
- [ ] Security vulnerability introduced
- [ ] Performance regression (>5s load time)
- [ ] Build errors preventing updates

**Rollback Decision Matrix:**

| Severity | Issue Type | Action | Timeline |
|----------|------------|--------|----------|
| Critical | Security, data corruption | Immediate rollback | <5 min |
| High | Core functionality broken | Rollback + hotfix | <15 min |
| Medium | Minor bugs, visual issues | Fix forward | <1 hour |
| Low | Cosmetic, non-critical | Fix in next release | Next sprint |

### Post-Rollback Actions

1. **Document Incident**
   - Record issue cause and resolution
   - Update team communication channels
   - Create post-mortem (if critical)

2. **Fix Root Cause**
   - Identify why deployment failed
   - Fix in development branch
   - Test thoroughly before redeploying

3. **Prevent Recurrence**
   - Add test coverage for failure scenario
   - Update deployment checklist
   - Consider staging environment (Phase 2)

---

## Additional Resources

### Official Documentation
- **Vercel Docs**: https://vercel.com/docs
- **Vite Docs**: https://vitejs.dev/guide/
- **React Docs**: https://react.dev/

### Support Channels
- **Vercel Support**: support@vercel.com
- **Vercel Community**: https://github.com/vercel/vercel/discussions
- **TokenTally Issues**: (Add GitHub issues URL after public repo)

### Related Documentation
- **CLAUDE.md**: Project overview and architecture
- **SECURITY.md**: Security standards and validation
- **README.md**: User-facing project documentation

---

## Deployment Summary

**Current Configuration:**
- **Platform**: Vercel
- **Node Version**: 20.11.0
- **Build Time**: ~1.6s
- **Bundle Size**: 305 KB gzipped (40% under target)
- **Security**: 0 vulnerabilities, headers configured ✅
- **Quality Gates**: TypeScript 0 errors, ESLint 0 warnings ✅

**Recommended Deployment Method**: GitHub Integration (automatic CI/CD)

**Post-Deployment Checklist:**
- [ ] Production URL accessible
- [ ] All features functional
- [ ] Performance meets targets (<2s load time)
- [ ] Security headers verified
- [ ] Monitoring configured (optional)
- [ ] Team notified of deployment

**Questions or Issues?**
Refer to [Troubleshooting](#troubleshooting) section or contact project maintainer.

---

*Last Updated: 2025-11-01*
*Document Version: 1.0.0*
