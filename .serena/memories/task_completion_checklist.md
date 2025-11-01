# TokenTally - Task Completion Checklist

When completing a development task, follow these steps to ensure quality and consistency:

## 1. Code Quality Checks

### Type Safety
```bash
npx tsc --noEmit
```
- ✅ No TypeScript errors
- ✅ All types explicitly declared
- ✅ No `any` types (or justified with comment)
- ✅ Strict null checks pass

### Linting
```bash
npm run lint
```
- ✅ No ESLint errors
- ✅ Zero warnings (max-warnings: 0)
- ✅ Security rules pass
- ✅ React hooks rules pass

## 2. Functional Validation

### Manual Testing
- ✅ Test in development mode (`npm run dev`)
- ✅ Test edge cases (zero, negative, NaN, Infinity)
- ✅ Verify calculations with hand calculations (within 1%)
- ✅ Test all user interactions and inputs
- ✅ Check real-time updates (<100ms)

### Build Verification
```bash
npm run build
npm run preview
```
- ✅ Production build succeeds without errors
- ✅ No console warnings in browser
- ✅ Application works in preview mode
- ✅ No broken imports or missing assets

## 3. Security Checks

### Input Validation
- ✅ All user inputs validated with min/max bounds
- ✅ No potential for code injection
- ✅ CSV exports sanitized (no formula injection)
- ✅ PDF exports don't execute code

### Dependency Security
```bash
npm audit
```
- ✅ No high or critical vulnerabilities
- ✅ Dependencies from trusted sources
- ✅ Exact versions in package.json

## 4. Code Review

### Self-Review Checklist
- ✅ No commented-out code (delete, don't comment)
- ✅ No console.log statements (except console.warn/error)
- ✅ No TODO/FIXME with security implications
- ✅ Function names are descriptive and verb-based
- ✅ Components follow single responsibility principle
- ✅ Pure functions have no side effects

### Documentation
- ✅ Complex logic has inline comments
- ✅ Public APIs have TSDoc comments
- ✅ CLAUDE.md updated if architecture changed
- ✅ README.md updated if user-facing features added

## 5. Git Workflow

### Before Committing
```bash
git status
git diff
```
- ✅ Review all changes
- ✅ No unintended file modifications
- ✅ No sensitive data (API keys, secrets)
- ✅ No large binary files

### Commit Message Format
```
<type>: <short description>

<detailed description if needed>
```
Types: feat, fix, refactor, docs, style, test, chore

Example:
```
feat: add prompt caching calculations for Claude models

- Implement cache hit rate modeling
- Add cache read pricing to LLM_PRICING config
- Update cost breakdown to show cache savings
```

## 6. Critical Accuracy Validation

### For Calculation Changes
- ✅ Test against known scenarios (hand-calculated)
- ✅ Verify ±5% precision target maintained
- ✅ Check edge cases (single turn, high volume, full context)
- ✅ Validate caching calculations (90% hit rate)
- ✅ Compare results across models for consistency

### For UI Changes
- ✅ Real-time updates work correctly
- ✅ No layout shifts or visual bugs
- ✅ Responsive design tested (mobile, tablet, desktop)
- ✅ Accessibility (keyboard navigation, screen reader)

## Quick Checklist

**Before Commit**:
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes  
- [ ] Manual testing complete
- [ ] `npm run build` succeeds
- [ ] Self-review complete
- [ ] Documentation updated

**Before Push**:
- [ ] `npm audit` shows no critical issues
- [ ] All tests pass
- [ ] Commit message descriptive
- [ ] No sensitive data in changes