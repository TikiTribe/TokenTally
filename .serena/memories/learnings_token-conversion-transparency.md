# Project Learnings: Token Conversion Transparency Implementation

## User Preferences Discovered

### UI/UX Preferences
- **Educational Content**: Prefers collapsible sections (default collapsed) to avoid UI clutter
- **Inline Hints**: Appreciates subtle conversion rate hints in tooltips and helper text
- **Consistent Messaging**: Values centralized configuration for consistent user experience
- **Word Count Display**: Wants real-time word count alongside token and character counts

### Development Preferences
- **Custom Implementations**: Prefers custom components over library dependencies (bundle size conscious)
- **Parallelized Execution**: Appreciates efficient parallelized implementation approach
- **Comprehensive Documentation**: Expects thorough documentation updates (CLAUDE.md)
- **Git Workflow**: Follows feature branch workflow with descriptive commits and PRs

### Quality Standards
- **TypeScript Strict Mode**: All code must compile without errors (11 strict flags)
- **Bundle Size Awareness**: Monitors bundle size impact (+1.29 KB = minimal, acceptable)
- **Validation Focus**: Prioritizes correctness over extensive testing for MVP features

## Technical Patterns Applied

### Component Design Patterns
1. **Collapsible Component**
   - useState for expand/collapse state management
   - Tailwind CSS for animation (rotate-180 transition)
   - ARIA attributes for accessibility

2. **Real-Time Display Updates**
   - Leverage existing utility functions (countWords, estimateTokensFromChars)
   - No additional state management or dependencies
   - Sub-millisecond performance

3. **Centralized Configuration**
   - Tooltip content in single file (tooltipContent.ts)
   - Consistent messaging across components
   - Easy maintenance and updates

### Documentation Standards
1. **JSDoc Best Practices**
   - File-level documentation with conversion rates
   - Function-level @param, @returns, @example
   - Practical examples for developer guidance

2. **Project Documentation (CLAUDE.md)**
   - Component responsibilities section
   - Technical patterns section
   - User-facing feature documentation

### Git Workflow Patterns
1. **Feature Branch Creation**
   - Descriptive branch names: feat/token-conversion-rate-transparency
   - Based on latest main branch commit

2. **Commit Message Format**
   - Type: feat, docs
   - Scope: feature area or file
   - Description: clear and concise
   - Example: "feat: add token conversion rate transparency throughout UI"

3. **Pull Request Best Practices**
   - Comprehensive PR description with implementation notes
   - Testing checklist for user verification
   - Screenshot requirements documented

## TokenTally Project Insights

### Architecture Patterns
- **Component Hierarchy**: TokenConversionHelper → Calculator/PromptCalculator → PromptInput
- **State Management**: Minimal state (only expand/collapse in new component)
- **Configuration Pattern**: Centralized tooltipContent.ts for consistent messaging

### Calculation Engine
- **Token Estimation**: 1.3 tokens/word (English language average)
- **Character Estimation**: 4 characters/token (average)
- **Inverse**: 0.77 words/token (derived)
- **Utilities**: estimateTokensFromChars, estimateTokensFromWords, countWords

### UI Design Philosophy
- **Progressive Disclosure**: Educational content collapsible by default
- **Inline Guidance**: Helper text shows practical examples
- **Tooltip Enhancement**: Conversion rates in tooltips for context-aware help
- **Real-Time Feedback**: Word/token/character counts update as user types

## Implementation Efficiency Strategies

### Parallelized Execution
- Identified 6 independent file modifications
- Executed all file changes in parallel
- Used TodoWrite for task tracking and progress visibility

### Reusable Utilities
- Leveraged existing tokenEstimator.ts functions
- No new utility functions needed
- Enhanced documentation for developer experience

### Custom vs. Library Decision Matrix
- **Custom Component**: When bundle size impact matters (TokenConversionHelper)
- **Library Dependency**: When complexity exceeds benefit (NOT applicable here)
- **Decision Criteria**: Bundle size, maintenance, flexibility

## Quality Gate Learnings

### TypeScript Compilation
- All new code must compile with strict mode (11 flags)
- No implicit any types allowed
- Comprehensive type safety for financial calculations

### Production Build Validation
- Must succeed with <2s build time
- Bundle size increase must be justified
- Dist folder generation confirms deployment readiness

### Bundle Size Monitoring
- Track gzipped size (production delivery format)
- Compare before/after for feature impact assessment
- Target: <500 KB total, minimal increase per feature

## Cross-Session Patterns

### Session Lifecycle
1. **Initialization**: /sc:load → review previous session summary
2. **Discovery**: Brainstorming mode for requirements gathering
3. **Implementation**: Parallelized execution with TodoWrite tracking
4. **Finalization**: Git workflow + documentation + screenshots
5. **Persistence**: /sc:save → checkpoint creation

### User Communication Style
- **Concise Requests**: Brief initial requests ("Everything works and looks great...")
- **Structured Responses**: Answers discovery questions in numbered format
- **Approval Signals**: Simple "Yes." to proceed with implementation
- **Task References**: Numeric references ("1, 2 and 3") for finalization tasks

### Feature Development Workflow
1. User requests feature with initial requirements
2. Discovery phase clarifies ambiguities and preferences
3. Implementation executes parallelized changes
4. Git workflow creates branch, commits, PR
5. Screenshot guide provided for visual documentation
6. CLAUDE.md updated with comprehensive feature documentation
7. Session saved with checkpoint for cross-session continuity

## Future Application

### When to Use Collapsible Components
- Educational content that shouldn't clutter primary UI
- Content needed for understanding but not for every interaction
- Default collapsed state with easy expand access

### When to Add Inline Hints
- Complex calculations or conversions
- Technical concepts that benefit from simple reminders
- Tooltip enhancement for context-aware help

### When to Update Centralized Configuration
- Consistent messaging changes across multiple components
- New tooltips or helper text additions
- Configuration-driven UI patterns

### Bundle Size Optimization Strategies
- Prefer custom components for simple UI patterns
- Evaluate library dependencies critically (bundle impact vs. benefit)
- Monitor gzipped production build size regularly
- Justify all bundle size increases with feature value
