# NoteEverything

**NoteEverything** is a beautiful, modern, GitHub-backed note-taking application designed for developers. It combines the speed of local-first editing with the reliability of Git version control.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8)

## ✨ Features

*   **Local-First:** Instant saving to LocalStorage. Zero latency typing.
*   **GitHub Sync:** Push and Pull notes directly to a private GitHub repository as Markdown files.
*   **WYSIWYG Editor:** Powered by TipTap, supporting rich text, lists, and code blocks.
*   **Modern UI:** "Linear-like" aesthetic with a polished Zinc theme (Light/Dark mode support).
*   **Recursive Tree:** Organize notes in an unlimited hierarchy.
*   **Portable:** Your notes are just Markdown files. No vendor lock-in.

## 🛠️ Tech Stack

*   **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS v4 + Tailwind Typography
*   **Auth:** NextAuth.js (GitHub Provider)
*   **Editor:** TipTap
*   **API:** Octokit (GitHub REST API)

## 🚀 Getting Started

### Prerequisites

*   Node.js 18+
*   A GitHub Account

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/matt1as/note-everything.git
    cd note-everything
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure GitHub OAuth:**
    *   Go to **[GitHub Developer Settings](https://github.com/settings/developers)**.
    *   Create a **New OAuth App** (Not a GitHub App).
    *   **Application Name:** NoteEverything
    *   **Homepage URL:** `http://localhost:3000`
    *   **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
    *   Copy the **Client ID** and generate a **Client Secret**.

4.  **Set up Environment Variables:**
    Copy the example file and update it with your credentials.
    ```bash
    cp .env.local.example .env.local
    ```
    Update `.env.local`:
    ```env
    GITHUB_ID=your_client_id_here
    GITHUB_SECRET=your_client_secret_here
    NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
    NEXTAUTH_URL=http://localhost:3000
    ```

5.  **Run the App:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage

1.  **Sign In:** Use the "Sign in" button in the sidebar to authenticate with GitHub.
2.  **Configure Repo:** Click the **Settings (Gear)** icon. Enter your GitHub username and the name of the repository you want to sync with (e.g., `my-notes`). The repo must exist.
3.  **Write:** Create notes using the **+** button.
4.  **Sync:** Use the **Push (Cloud Arrow)** button in the sidebar footer to commit your changes to GitHub.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.