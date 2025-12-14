# NoteEverything

**NoteEverything** is a beautiful, modern, GitHub-backed note-taking application designed for developers. It combines the speed of local-first editing with the reliability of Git version control.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8)

## 📚 Table of Contents

- [Features](#-features)
- [Tech Stack](#%EF%B8%8F-tech-stack)
- [Architecture at a Glance](#-architecture-at-a-glance)
- [Getting Started](#-getting-started)
- [Environment Variables](#%EF%B8%8F-environment-variables)
- [GitHub Sync Workflow](#-github-sync-workflow)
- [Project Structure](#%EF%B8%8F-project-structure)
- [Development](#-development)
- [Troubleshooting](#-troubleshooting)
- [Usage Tips](#-usage-tips)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

- **Local-First Editing:** Notes are persisted instantly to LocalStorage for zero-latency typing.
- **GitHub Sync:** Push and pull notes to your own repository as Markdown + frontmatter.
- **TipTap WYSIWYG Editor:** Rich text, lists, code blocks, and keyboard shortcuts.
- **Modern UI:** “Linear-like” layout with polished Zinc theme, dark/light mode, and subtle animations.
- **Recursive Tree:** Nest notes infinitely to map your projects and ideas.
- **Portable Markdown:** Notes live as regular `.md` files in `notes/` in your repo—no vendor lock-in.

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Language:** TypeScript + strict typing via custom note interfaces.
- **Styling:** Tailwind CSS v4 with Tailwind Typography and `tailwind-merge`.
- **Auth:** NextAuth.js + GitHub provider with `repo user:email` scopes.
- **Editor:** TipTap Starter Kit + Placeholder extension.
- **Sync API:** Octokit REST client, Turndown (HTML→Markdown), Marked (Markdown→HTML).

## 🧠 Architecture at a Glance

- **Local State:** `NotesContext` keeps the active note tree, sync state, and GitHub config.
- **Persistence:** Notes, config, and selection are saved under `note-everything-*` keys in LocalStorage.
- **Sync Control:** A debounced auto-sync pushes changes ~5 seconds after edits; a background auto-pull checks GitHub every 60 seconds when the tab is visible and no unsynced local edits exist.
- **File Layout:** Sync stores each note as `notes/<parent>/.../<note>.md`. Filenames are deterministic slugs derived from titles, with counters added to avoid collisions.
- **Metadata:** Markdown files include frontmatter (id, title, timestamps, parentId) so hierarchy and ordering survive round-trips.

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or later (Next.js 16 requirement)
- Git + GitHub account with permission to create OAuth apps and private repos

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/matt1as/note-everything.git
   cd note-everything
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Create a GitHub OAuth App**
   - Navigate to [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers).
   - Choose **New OAuth App** (not a GitHub App).
   - **Homepage:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
   - Copy the Client ID and Secret for the next step.
4. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   # then edit .env.local with your OAuth credentials
   ```
5. **Start the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) and sign in with GitHub.

## ⚙️ Environment Variables

| Variable | Description |
| --- | --- |
| `GITHUB_ID` | OAuth App Client ID (requires scopes `repo user:email`). |
| `GITHUB_SECRET` | OAuth App Client Secret. |
| `NEXTAUTH_SECRET` | Random 32-byte string for NextAuth session signing (`openssl rand -base64 32`). |
| `NEXTAUTH_URL` | Base URL of the app. Use `http://localhost:3000` locally; set to your production domain before deploying. |

> Make sure to restart `npm run dev` whenever you change `.env.local`.

## 🔐 GitHub Sync Workflow

1. **Authentication:** Users sign in via GitHub OAuth; NextAuth injects a short-lived access token into the session so API routes can call Octokit.
2. **Repository Configuration:** Use the sidebar **Settings** modal to pick `<owner>/<repo>` and branch (defaults to `main`). The repository must already exist, and the authenticated user needs push access.
3. **Auto-Save & Sync:** Edits update LocalStorage immediately and queue an auto-sync. After 5 seconds without edits, `/api/github/push` converts HTML → Markdown, writes frontmatter, and pushes to `notes/`.
4. **Auto-Pull:** Every minute the app hits `/api/github/pull` and merges remote updates as long as your local notes match the last synced state (prevents overwriting unsynced offline work). You can always prompt a refresh via the Settings modal.
5. **File Format:** Each note becomes `notes/<slugified-path>.md` with content:
   ```markdown
   ---
   id: <uuid>
   title: Note title
   createdAt: 2024-01-01T12:00:00.000Z
   updatedAt: 2024-01-01T12:30:00.000Z
   parentId: null
   ---
   Markdown content...
   ```
   These files are ordinary Markdown files—you can edit them anywhere and pull back the changes.

## 🗂️ Project Structure

```
app/               # Next.js app router pages, layout, API routes (auth + GitHub)
components/        # UI building blocks (Sidebar, Editor, SettingsModal, Providers)
components/ui/     # Smaller UI primitives (buttons, inputs, etc.)
lib/               # Auth config and shared utilities
types/             # Shared TypeScript interfaces and NextAuth augmentation
public/            # Static assets (favicons, icons)
```

## 🧑‍💻 Development

- `npm run dev` – start Next.js in development mode.
- `npm run build` – create an optimized production build.
- `npm run start` – run the production build locally.
- `npm run lint` – lint source files with the configured ESLint + Next rules.

## ✅ Testing

- `npm run test` – execute the Vitest unit suite (contexts, UI, and API routes). Use `npm run test:watch` for local dev loops.
- `npm run test:e2e` – launch the Playwright smoke test that boots the Next dev server with safe placeholder GitHub credentials and verifies creating a local note; run `npx playwright install` once to provision browsers.
- CI (GitHub Actions) runs lint, unit, and Playwright flows on every push/PR to block regressions automatically.

## 🧯 Troubleshooting

- **401/403 during push/pull:** Your GitHub token likely expired—sign out and in again, or confirm the OAuth app includes the `repo` scope.
- **Sync button disabled:** Ensure a repo is configured and you have not lost your GitHub session (check the sidebar avatar).
- **Missing files in GitHub:** Only notes beneath the `notes/` folder are managed. If you manually move files elsewhere, the app will treat them as deleted.
- **Conflicts after manual edits:** If you edit Markdown directly on GitHub, pull changes before resuming local edits to avoid the dirty-state guard blocking auto-pull.
- **Large repositories:** The recursive fetch reads every file beneath `notes/`; keep unrelated documents outside that folder to reduce API calls.

## 📖 Usage Tips

- Use the **“+”** button to add sibling or nested notes—children inherit hierarchy based on the active selection.
- The **Settings → Refresh from Cloud** button is a manual pull for recovering from rate limits or when switching devices.
- All LocalStorage keys start with `note-everything-`. Clearing them resets the app without touching GitHub data.
- Light/dark preferences follow your system setting automatically; toggle your OS theme to preview both states.

## 🤝 Contributing

1. Fork the repo and create a feature branch.
2. Run `npm run lint` before opening a Pull Request.
3. Include a short description of the UI/UX impact or screenshots for front-end changes.

Bug reports, design ideas, and documentation fixes are welcome—even a paragraph update like this one helps everyone onboard faster.

## 📄 License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.
