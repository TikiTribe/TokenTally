# Security Standards for TokenTally

## Security Context

TokenTally is a **client-side only** application with minimal security surface:

✅ **No Security Concerns:**
- No user accounts or authentication
- No API keys or server secrets
- No database or persistent storage
- No server-side code execution
- All calculations performed in browser
- All data stays in user's browser (privacy benefit)

⚠️ **Active Security Considerations:**
- Dependency security (third-party packages)
- Input validation (prevent calculation errors)
- XSS prevention (React best practices)
- Safe export generation (PDF/CSV)

---

## 1. Dependency Security

### Rules
- Run `npm audit` before every release
- Use only well-maintained packages (>1M downloads/week, active maintenance)
- Pin exact versions in `package.json` (no `^` or `~` for production dependencies)
- Review dependency tree for suspicious or unmaintained packages
- Use automated scanning tools (Socket.dev, Snyk, or npm audit)

### TokenTally Dependencies
All production dependencies should use exact versions:

```json
{
  "dependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "zustand": "4.5.0",
    "recharts": "2.12.7",
    "jspdf": "2.5.1",
    "jspdf-autotable": "3.8.2"
  }
}
```

### Pre-Release Checklist
- [ ] Run `npm audit` and resolve all high/critical vulnerabilities
- [ ] Run `npm outdated` and update dependencies with security patches
- [ ] Review `npm ls` for unexpected new transitive dependencies
- [ ] Check npm advisories for known vulnerabilities

---

## 2. Input Validation

### Rules
- Validate all user inputs with min/max ranges
- Type-check inputs using TypeScript strict mode
- Sanitize inputs before calculations
- Handle edge cases (0, negative, NaN, Infinity, null, undefined)

### TokenTally-Specific Validation

```typescript
/**
 * Validates conversation volume input
 * @param value - User input for conversations per month
 * @returns Validated number within acceptable range
 * @throws Error if input is not a finite number
 */
function validateConversationsPerMonth(value: number): number {
  const MIN = 1;
  const MAX = 10_000_000;

  if (!Number.isFinite(value)) {
    throw new Error('Conversations per month must be a valid number');
  }

  if (value < MIN) {
    console.warn(`Conversations per month clamped to minimum: ${MIN}`);
    return MIN;
  }

  if (value > MAX) {
    console.warn(`Conversations per month clamped to maximum: ${MAX}`);
    return MAX;
  }

  return Math.floor(value);
}

/**
 * Validates token count input
 * @param value - User input for token count
 * @returns Validated non-negative integer
 */
function validateTokenCount(value: number): number {
  const MIN = 0;
  const MAX = 1_000_000; // 1M tokens max per field

  if (!Number.isFinite(value)) {
    throw new Error('Token count must be a valid number');
  }

  return Math.max(MIN, Math.min(MAX, Math.floor(value)));
}

/**
 * Validates cache hit rate percentage
 * @param value - User input for cache hit rate (0-100)
 * @returns Validated percentage as decimal (0.0-1.0)
 */
function validateCacheHitRate(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Cache hit rate must be a valid number');
  }

  const clamped = Math.max(0, Math.min(100, value));
  return clamped / 100;
}
```

### Input Validation Checklist
- [ ] All numeric inputs have min/max bounds
- [ ] Type guards for all user inputs
- [ ] No inputs can cause division by zero
- [ ] No inputs can cause infinite loops
- [ ] Edge cases tested (0, negative, huge numbers, decimals)

---

## 3. XSS Prevention

### Rules
- **Never** use `dangerouslySetInnerHTML`
- Rely on React's automatic escaping (default behavior)
- No `eval()`, `Function()`, or dynamic code execution
- Sanitize any user text before PDF export
- No inline event handlers in JSX

### TokenTally Risk Assessment
**Risk Level: LOW** - No user-generated HTML content, no rich text editors, no markdown rendering.

### Best Practices
```typescript
// ✅ SAFE: React auto-escapes
<div>{userInput}</div>

// ❌ UNSAFE: Never do this
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ SAFE: User input in calculations
const cost = userInput * pricePerToken;

// ❌ UNSAFE: Never evaluate user input as code
eval(userInput); // NEVER DO THIS
```

---

## 4. PDF/CSV Export Security

### PDF Export (jsPDF)
**Risks:** Malicious content injection, formula execution, external resource loading

```typescript
/**
 * Sanitizes text for PDF export
 * Prevents injection attacks and ensures clean output
 */
function sanitizeForPDF(value: string | number): string {
  if (typeof value === 'number') {
    return value.toFixed(2);
  }

  // Remove control characters and non-printable characters
  return String(value)
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    .substring(0, 1000); // Limit length to prevent memory issues
}
```

### CSV Export
**Risks:** Formula injection (Excel/Google Sheets execute formulas starting with `=`, `+`, `-`, `@`)

```typescript
/**
 * Prevents CSV formula injection attacks
 * Prefixes dangerous characters with single quote
 */
function sanitizeForCSV(value: string | number): string {
  const str = String(value);

  // Check for formula injection indicators
  const dangerousChars = ['=', '+', '-', '@'];
  if (dangerousChars.some(char => str.startsWith(char))) {
    return `'${str}`; // Prefix with single quote to treat as text
  }

  // Escape quotes
  return str.replace(/"/g, '""');
}

/**
 * Generates safe CSV content
 */
function generateCSV(data: Array<Record<string, any>>): string {
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(header => sanitizeForCSV(row[header])).join(',')
  );

  return [
    headers.join(','),
    ...rows
  ].join('\n');
}
```

### Export Security Checklist
- [ ] All PDF text sanitized before generation
- [ ] CSV formulas prevented with quote prefix
- [ ] No external resources (images, fonts) loaded from CDN
- [ ] Export file size limited (<10MB)
- [ ] Export doesn't execute any code

---

## 5. TypeScript Strict Mode

### Configuration (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Benefits
- Catch type errors at compile time
- Prevent null/undefined bugs in financial calculations
- Enforce explicit types for critical business logic
- Better IDE support and autocomplete

---

## 6. ESLint Security Rules

### Configuration (`.eslintrc.json`)
Security-focused linting rules to catch dangerous patterns:

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:security/recommended"
  ],
  "plugins": ["security"],
  "rules": {
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "no-script-url": "error",
    "security/detect-object-injection": "warn",
    "security/detect-unsafe-regex": "error",
    "security/detect-buffer-noassert": "error",
    "security/detect-child-process": "error",
    "security/detect-disable-mustache-escape": "error",
    "security/detect-no-csrf-before-method-override": "error",
    "security/detect-non-literal-regexp": "warn",
    "security/detect-possible-timing-attacks": "warn",
    "security/detect-pseudoRandomBytes": "error"
  }
}
```

---

## 7. No Secrets in Code

### Rules
- No API keys (not applicable - no backend)
- No hardcoded credentials
- No `.env` files with secrets
- Add `.env` to `.gitignore` anyway (best practice)

### TokenTally Status
**N/A** - No secrets needed for client-side calculations.

### .gitignore
```gitignore
# Dependencies
node_modules/

# Production build
dist/
build/

# Environment files (even though not used)
.env
.env.local
.env.production

# IDE
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db
```

---

## 8. Content Security Policy (Future)

While not needed for MVP (static site), consider adding CSP headers when deploying:

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;">
```

**Note:** Only add if deploying to Vercel/Netlify with custom headers support.

---

## Security Release Checklist

Before each release, complete this checklist:

### Dependencies
- [ ] Run `npm audit` and resolve all high/critical vulnerabilities
- [ ] Run `npm outdated` and review dependency updates
- [ ] Review `npm ls` for unexpected packages
- [ ] Check for deprecated packages

### Code Quality
- [ ] Run `npm run lint` and fix all errors
- [ ] Run `npm run type-check` (TypeScript compilation)
- [ ] No `console.log()` or `debugger` statements
- [ ] No `TODO` or `FIXME` comments with security implications

### Input Validation
- [ ] Test all inputs with edge cases (0, negative, huge numbers)
- [ ] Test all inputs with invalid data (null, undefined, NaN, Infinity)
- [ ] Test all inputs with special characters and Unicode
- [ ] Verify input clamping works correctly

### Export Security
- [ ] Test PDF export with special characters
- [ ] Test CSV export with formula injection payloads (`=1+1`, `@SUM(A1:A10)`)
- [ ] Verify exports don't execute code
- [ ] Test export file sizes with maximum inputs

### Build & Deployment
- [ ] Production build succeeds without warnings
- [ ] Bundle size is reasonable (<500KB initial load)
- [ ] No secrets or API keys in source code
- [ ] No source maps in production (unless intentional)

---

## Vulnerability Reporting

If you discover a security vulnerability in TokenTally:

1. **Do NOT** create a public GitHub issue
2. Email the maintainer directly with details
3. Include steps to reproduce
4. Provide suggested fix if possible

We will acknowledge within 48 hours and provide a timeline for fix and disclosure.

---

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)
- [npm Security Best Practices](https://docs.npmjs.com/security-best-practices)
- [CSV Injection Prevention](https://owasp.org/www-community/attacks/CSV_Injection)

---

**Last Updated:** January 2025
**Review Frequency:** Every release + quarterly dependency audit
