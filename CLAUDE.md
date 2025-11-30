# NoteEverything - Claude Context

## Project Overview

NoteEverything is a local-first, GitHub-backed note-taking application built for developers. It combines instant local editing with Git version control, storing notes as Markdown files in a GitHub repository.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + Tailwind Typography
- **Auth**: NextAuth.js (GitHub Provider)
- **Editor**: TipTap (WYSIWYG rich text editor)
- **GitHub API**: Octokit (@octokit/rest)
- **Storage**: LocalStorage (local-first) + GitHub (sync)

## Key Architecture Patterns

### Local-First Design
- Notes are saved immediately to LocalStorage for zero-latency editing
- GitHub sync is optional and user-initiated via Push/Pull actions
- Data flows: LocalStorage ↔ App State ↔ GitHub Repository

### Data Model
- Notes are stored as Markdown files with frontmatter metadata
- Hierarchical organization using recursive tree structure
- Each note has a unique ID (UUID) and can have parent-child relationships

### File Structure Convention
- Notes are organized in meaningful folder hierarchies in GitHub
- Filenames use slugified note titles instead of UUIDs
- Frontmatter includes: id, title, createdAt, updatedAt, parent

## Development Guidelines

### Code Style
- Use TypeScript strictly - no `any` types
- Follow Next.js App Router conventions
- Use server components by default, client components only when needed
- Prefer functional components and hooks

### UI/UX Standards
- Modern "Linear-like" aesthetic with Zinc color scheme
- Support both light and dark modes
- Clean, minimal interface with attention to detail
- Use Lucide React for icons

### API Routes
- GitHub operations are handled through Next.js API routes
- Authentication required for all GitHub operations
- Rate limiting and error handling for GitHub API calls

## Common Tasks

### Adding New Features
1. Consider local-first principle - does it work offline?
2. Update TypeScript types in relevant files
3. Follow existing patterns for state management
4. Ensure GitHub sync compatibility

### Working with Notes
- Notes use TipTap for editing (HTML internally, Markdown for storage)
- Conversion: HTML ↔ Markdown using Turndown and Marked libraries
- Always preserve note metadata during transformations

### GitHub Integration
- Use Octokit for all GitHub API interactions
- Handle authentication via NextAuth session
- Respect GitHub API rate limits
- Provide clear error messages for sync failures

## Environment Variables

Required for development:
- `GITHUB_ID` - GitHub OAuth App Client ID
- `GITHUB_SECRET` - GitHub OAuth App Client Secret
- `NEXTAUTH_SECRET` - Random secret for NextAuth
- `NEXTAUTH_URL` - Application URL (http://localhost:3000 for dev)

## Testing Approach

- Manual testing in browser (no automated test suite yet)
- Test both authenticated and unauthenticated states
- Verify LocalStorage persistence
- Test GitHub sync with real repository

## Known Constraints

- Notes must be synced to a GitHub repository that already exists
- GitHub authentication is required for sync features
- LocalStorage has browser size limits (~5-10MB typically)
- Markdown conversion may not preserve all HTML formatting

## Helpful Context

- This is a personal productivity tool, not a multi-user SaaS
- Privacy-focused: notes stored in user's own GitHub repo
- No backend database - relies on LocalStorage + GitHub
- Designed for technical users comfortable with Git concepts
