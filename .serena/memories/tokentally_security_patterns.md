# TokenTally Security Patterns and Compliance

**Last Updated**: 2025-11-01
**Security Status**: EXCELLENT (0 vulnerabilities, production-approved)

## Security Framework

### OWASP Top 10 2021 Compliance

**A03:2021 - Injection Prevention** (Primary applicable category):
- **CSV Formula Injection**: Implemented sanitization in `src/utils/csvExporter.ts`
- **Pattern**: Prefix dangerous characters (`=`, `+`, `-`, `@`) with single quote
- **Implementation**: `sanitizeForCSV()` function applied to all user inputs before export
- **Testing**: Manual validation with edge cases (formulas, special characters)

```typescript
// CSV sanitization pattern
function sanitizeForCSV(value: string | number): string {
  const str = String(value);
  const dangerousChars = ['=', '+', '-', '@'];
  if (dangerousChars.some((char) => str.startsWith(char))) {
    return `'${str}`; // Prefix with single quote to treat as text
  }
  return str.replace(/"/g, '""'); // Escape double quotes
}
```

**XSS Prevention** (Not directly applicable - client-side only):
- **React Auto-Escaping**: All user input rendered through React JSX (automatic escaping)
- **No innerHTML**: No usage of dangerouslySetInnerHTML or innerHTML
- **Controlled Components**: All form inputs use controlled React components
- **Pattern**: `<textarea value={value} onChange={handler} />`

**Authentication/Authorization** (N/A - no user accounts):
- **Design Decision**: Client-side only application with no backend
- **Privacy Benefit**: No user data stored or transmitted
- **Security Surface**: Minimal (no API keys, credentials, or user authentication)

## Input Validation Framework

### Validation Pattern (src/utils/validators.ts)

**Core Validation Function**:
```typescript
export function validateTokenCount(
  value: number,
  min: number,
  max: number,
): ValidationResult {
  // 1. Type checking
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return { valid: false, value: min, warning: '...' };
  }
  
  // 2. Range clamping
  if (value < min) return { valid: true, value: min, warning: '...' };
  if (value > max) return { valid: true, value: max, warning: '...' };
  
  // 3. Integer conversion
  return { valid: true, value: Math.floor(value) };
}
```

**Validation Rules**:
- **Token counts**: 1 to 100,000 (system prompt), 1 to 10,000 (messages/responses)
- **Conversations**: 1 to 10,000,000 per month
- **Cache hit rate**: 0.0 to 1.0 (decimal)
- **Context strategy**: Enum validation ('minimal' | 'moderate' | 'full')

## Dependency Security

### Current Status (2025-11-01)
- **npm audit**: 0 vulnerabilities
- **Vite**: 6.4.1 (upgraded from 5.4.21 for security)
- **jsPDF**: 3.0.3 (800K+ weekly downloads, well-maintained)
- **React**: 18.3.1 (latest stable)

### Maintenance Pattern
1. Run `npm audit` before releases
2. Use exact versions in package.json (no `^` or `~`)
3. Review dependency tree for suspicious packages
4. Only use well-maintained packages (>1M downloads/week)

## TypeScript Strict Mode (Security Feature)

**11 Strict Flags Enabled** (tsconfig.json):
- `strict: true` (master flag)
- `noImplicitAny: true` - Prevents type errors in calculations
- `strictNullChecks: true` - Prevents null/undefined errors
- `strictFunctionTypes: true` - Function type safety
- `strictBindCallApply: true` - Method call safety
- `strictPropertyInitialization: true` - Class property safety
- `noImplicitThis: true` - Context binding safety
- `alwaysStrict: true` - ES5 strict mode
- `noUnusedLocals: true` - Code cleanliness
- `noUnusedParameters: true` - Function signature safety
- `noImplicitReturns: true` - Return value safety
- `noFallthroughCasesInSwitch: true` - Switch statement safety
- `noUncheckedIndexedAccess: true` - Array/object access safety
- `noImplicitOverride: true` - Inheritance safety

**Result**: 0 TypeScript errors with maximum type safety

## Export Security

### PDF Export (src/utils/pdfExporter.ts)
- **Library**: jsPDF (well-maintained, 800K+ weekly downloads)
- **Approach**: Text-only generation through jsPDF API
- **Risk Level**: LOW (jsPDF provides implicit sanitization)
- **Recommendation**: Add explicit sanitization for defense-in-depth (LOW priority)

### CSV Export (src/utils/csvExporter.ts)
- **Primary Risk**: Formula injection (OWASP A03:2021)
- **Mitigation**: `sanitizeForCSV()` function applied to ALL user inputs
- **Testing**: Manual validation with edge cases
- **Status**: COMPLIANT

## Deployment Security (vercel.json)

**Security Headers**:
```json
{
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin"
}
```

**Asset Caching**:
- Immutable assets: `public, max-age=31536000, immutable`
- Security headers applied to all routes

## Threat Model (STRIDE Analysis)

**Spoofing**: N/A (no authentication)
**Tampering**: LOW (client-side calculations, no server state)
**Repudiation**: N/A (no user accounts or logging)
**Information Disclosure**: LOW (no sensitive data stored)
**Denial of Service**: LOW (static site, Vercel CDN protection)
**Elevation of Privilege**: N/A (no privilege levels)

**Overall Risk Level**: LOW
**Primary Attack Surface**: CSV formula injection (MITIGATED)

## Security Testing Checklist

**Pre-Release**:
- [ ] Run `npm audit` - 0 vulnerabilities
- [ ] Test CSV export with formulas (`=SUM()`, `+`, `-`, `@`)
- [ ] Verify TypeScript compilation (0 errors)
- [ ] Check for console.log/TODO with security implications
- [ ] Validate input edge cases (0, negative, NaN, Infinity)
- [ ] Production build succeeds without warnings

**Post-Deployment**:
- [ ] Verify security headers in production (dev tools → Network)
- [ ] Test calculator functionality in production environment
- [ ] Monitor Vercel logs for unusual activity

## Key Patterns Learned

1. **Client-Side Security**: Focus on input validation, dependency security, and safe exports
2. **OWASP Application**: Even client-side apps need injection prevention (CSV formulas)
3. **TypeScript as Security**: Strict mode prevents entire classes of runtime errors
4. **Defense in Depth**: Multiple layers (validation → sanitization → TypeScript → React escaping)
5. **Privacy by Design**: No backend = no data breach risk
