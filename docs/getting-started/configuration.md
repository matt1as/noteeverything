# Configuration

Before running NoteEverything, you need to configure GitHub OAuth authentication.

## GitHub OAuth Setup

### 1. Create a GitHub OAuth Application

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App** (not a GitHub App)
3. Fill in the application details:
   - **Application Name:** NoteEverything
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
4. Click **Register application**
5. Copy the **Client ID**
6. Generate a **Client Secret** and copy it

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Update the file with your credentials:

```env
GITHUB_ID=your_client_id_here
GITHUB_SECRET=your_client_secret_here
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000
```

**Generating NEXTAUTH_SECRET:**

```bash
openssl rand -base64 32
```

## Next Steps

Proceed to the [Quick Start Guide](./quick-start.md) to run the application.
