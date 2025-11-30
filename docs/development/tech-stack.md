# Technology Stack

NoteEverything is built with modern web technologies for optimal performance and developer experience.

## Frontend Framework

### Next.js 14

- **App Router:** Server components and streaming
- **React Server Components:** Improved performance
- **TypeScript:** Full type safety throughout the application

## Styling

### Tailwind CSS v4

- **Utility-First:** Rapid UI development
- **Custom Configuration:** Zinc color scheme
- **Tailwind Typography:** Beautiful markdown rendering

## Editor

### TipTap

- **WYSIWYG Editing:** Rich text editing experience
- **ProseMirror-Based:** Robust document structure
- **Extensible:** Custom node types and marks
- **Keyboard Shortcuts:** Familiar editing commands

## Authentication

### NextAuth.js

- **GitHub Provider:** OAuth integration
- **Session Management:** Secure user sessions
- **TypeScript Support:** Type-safe auth hooks

## GitHub Integration

### Octokit

- **GitHub REST API:** Full API access
- **Repository Operations:** Read/write to repositories
- **Content Management:** Create and update files
- **Authentication:** Token-based access

## State Management

### React Context

- **NotesContext:** Global notes state
- **LocalStorage:** Persistent local data
- **Optimistic Updates:** Immediate UI feedback

## Development Tools

### TypeScript

- **Type Safety:** Catch errors at compile time
- **IntelliSense:** Enhanced developer experience
- **Interfaces:** Well-defined data structures

### ESLint

- **Code Quality:** Consistent code style
- **Best Practices:** Enforce React and Next.js patterns

## Build and Deployment

### Vercel-Ready

- **Zero Configuration:** Deploy with one click
- **Edge Functions:** Low-latency API routes
- **Automatic HTTPS:** Secure by default

## File Structure

```
note-everything/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── Editor.tsx        # TipTap editor
│   ├── NotesContext.tsx  # State management
│   ├── Sidebar.tsx       # Navigation
│   └── SettingsModal.tsx # Configuration
├── lib/                   # Utility functions
│   ├── auth.ts           # NextAuth configuration
│   └── utils.ts          # Helper functions
├── types/                 # TypeScript definitions
└── public/               # Static assets
```

## API Routes

- `POST /api/github/push` - Commit notes to GitHub
- `GET /api/github/pull` - Fetch notes from GitHub
- `/api/auth/*` - NextAuth authentication endpoints
