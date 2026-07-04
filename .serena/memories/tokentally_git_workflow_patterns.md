# TokenTally Git Workflow Patterns

**Last Updated**: 2025-11-01
**Repository**: TikiTribe/TokenTally
**Default Branch**: main

## Feature Branch Workflow

### Standard Pattern
1. **Create Feature Branch**: `git checkout -b feature-name`
2. **Make Changes**: Edit files, test locally
3. **Stage Changes**: `git add [files]`
4. **Commit**: `git commit -m "message"`
5. **Push**: `git push -u origin feature-name`
6. **Create PR**: GitHub MCP or web interface
7. **Merge**: Squash merge to main
8. **Cleanup**: Delete feature branch locally and remotely

### Commit Message Template

**Format**: Claude Code standard with Co-Authored-By

```markdown
[Type]: [Brief title]

[Detailed description with context]

Core Features:
- Feature 1 description
- Feature 2 description

[Category] & [Category]:
- Specific detail 1
- Specific detail 2

[Category]:
- Detail with context

🤖 Generated with Claude Code (https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Example from Production-Ready Commit**:
```
Production-ready: Dual calculator MVP with security compliance

Core Features:
- Dual calculator system (Chatbot + Prompt calculators)
- 6 LLM models (OpenAI: 3, Claude: 3)
- Real-time cost calculations (<100ms updates)

Prompt Calculator (NEW):
- Multi-line prompt input with character/token tracking
- Response size presets (Small/Medium/Large/XLarge)
- Batch operations volume configuration

Security & Quality:
- OWASP A03:2021 compliant (CSV formula injection prevention)
- 0 vulnerabilities (npm audit clean, Vite 6.4.1 upgrade)
- TypeScript strict mode (11 flags, 0 errors)

Testing & Validation:
- 22/22 test scenarios passing (100% pass rate)
- 0.00% - 3.90% accuracy variance (exceeds ±5% target)

Project Status:
- Phase: PRODUCTION READY
- Completion: 11 of 12 tasks (91.7%)

🤖 Generated with Claude Code (https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Pull Request Workflow

### GitHub MCP Integration

**PR Creation Pattern**:
```typescript
mcp__github__create_pull_request({
  owner: "TikiTribe",
  repo: "TokenTally",
  title: "Descriptive Title with Key Feature",
  head: "feature-branch-name",
  base: "main",
  body: `$(cat <<'EOF'
## Summary
[High-level overview]

### 🎯 Key Features
[Bullet points of major features]

### 🛡️ Security & Quality
[Security compliance and quality metrics]

### 📦 Deployment Configuration
[Deployment readiness details]

### 📚 Documentation
[Documentation updates]

### ✅ Test Plan
[Testing checklist]

🤖 Generated with Claude Code
EOF
)`
})
```

**PR Merge Pattern**:
```typescript
mcp__github__merge_pull_request({
  owner: "TikiTribe",
  repo: "TokenTally",
  pullNumber: 1,
  merge_method: "squash", // Clean commit history
  commit_title: "Title with PR number (#1)",
  commit_message: "Concise summary with key highlights"
})
```

### Squash Merge Benefits
1. **Clean History**: Single commit per feature on main branch
2. **Easy Rollback**: Can revert entire feature with single commit
3. **Readable Log**: `git log` shows major features, not WIP commits
4. **Bisect Friendly**: Easier to find bugs with `git bisect`

## Branch Naming Conventions

**Pattern**: `[type]/[descriptive-name]`

**Types**:
- `feature/` - New functionality
- `fix/` - Bug fixes
- `docs/` - Documentation only
- `refactor/` - Code restructuring
- `test/` - Testing improvements
- `chore/` - Maintenance tasks

**Examples**:
- `feature/prompt-calculator`
- `fix/csv-export-sanitization`
- `docs/production-ready-documentation`
- `refactor/cost-calculation-engine`

## Git Status Checks

**Before Starting Work**:
```bash
git status              # Check working directory
git branch              # Verify current branch
git pull origin main    # Update local main
```

**Before Committing**:
```bash
git status              # Review changes
git diff                # Review specific changes
git diff --stat         # Summary of changes
```

**After Merge**:
```bash
git checkout main       # Switch to main
git pull origin main    # Pull merged changes
git branch -d feature-name  # Delete local branch
```

## File Staging Patterns

### Selective Staging
**Production files only** (exclude temp/debug files):
```bash
git add [specific-files]  # Stage production files
git status               # Verify staged files
# Exclude: .serena/*, claudedocs/*, investigate-*.ts, test-*.ts
```

### Full Project Staging
**For complete features**:
```bash
git add .  # Stage all changes
git status # Verify everything intended is staged
```

## GitHub MCP Tools Used

1. **get_me**: Verify GitHub authentication
2. **create_pull_request**: Create PR with detailed body
3. **merge_pull_request**: Merge with squash strategy
4. **pull_request_read**: Verify PR status and details

## Post-Merge Cleanup

**Local Cleanup**:
```bash
git branch -d feature-name  # Delete local branch
```

**Remote Cleanup** (automatic with GitHub MCP merge):
- Remote branch automatically cleaned up by GitHub
- No manual `git push origin --delete` needed

## Best Practices

1. **Never Work on Main**: Always create feature branch
2. **Descriptive Commits**: Clear, comprehensive commit messages
3. **Small PRs**: Easier to review and merge (except production-ready milestones)
4. **Squash Merge**: Keep main branch history clean
5. **Immediate Cleanup**: Delete branches after merge
6. **Status Checks**: Verify status before and after operations

## Commit Statistics

**Production-Ready Merge** (PR #1):
- **Files Changed**: 18
- **Additions**: 4,088 lines
- **Deletions**: 35 lines
- **Commits**: 1 (squashed)
- **Merge SHA**: d714c8e4f872bc9e7ea3e38047f230a65bd13f7d

## Rollback Strategy

**If Deployment Fails**:
```bash
git revert d714c8e  # Revert production-ready merge
git push origin main  # Push revert to GitHub
```

**Advantages of Squash Merge**:
- Single commit to revert entire feature
- No need to revert multiple WIP commits
- Clean rollback without breaking history
