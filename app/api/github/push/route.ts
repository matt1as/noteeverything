import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Octokit } from "@octokit/rest"
import TurndownService from "turndown"
import matter from "gray-matter"
import { Note, PersistedGitHubConfig } from "@/types"
import { NextResponse } from "next/server"

const turndownService = new TurndownService()

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.accessToken) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { notes, config } = await req.json() as { notes: Note[], config: PersistedGitHubConfig }
  
  if (!config || !config.owner || !config.repo) {
    return new NextResponse("Invalid Config", { status: 400 })
  }

  const octokit = new Octokit({
    auth: session.accessToken
  })

  const owner = config.owner
  const repo = config.repo
  const branch = config.branch || 'main'
  const errors: string[] = []

  // 1. Get current files in notes/ directory to find deletions and SHAs
  let currentFiles: any[] = []
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'notes',
      ref: branch
    })
    if (Array.isArray(data)) {
      currentFiles = data
    }
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (e.status === 404) {
      // Folder doesn't exist, which is fine (first push)
      currentFiles = []
    } else {
       console.error("Error fetching notes folder:", e)
       return new NextResponse(`Failed to access repo: ${e.message || String(e)}`, { status: 500 })
    }
  }

  // 2. Process Notes to Push
  for (const note of notes) {
    try {
        const markdownBody = turndownService.turndown(note.content || '')
        const fileContent = matter.stringify(markdownBody, {
          id: note.id,
          title: note.title,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          parentId: note.parentId || null
        })
        
        // Sanitize title for filename
        const slug = note.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled'
        const filename = `notes/${note.id}-${slug}.md`
        
        const existingFile = currentFiles.find(f => f.path === filename)
        const sha = existingFile ? existingFile.sha : undefined
        
        await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: filename,
            message: `Update note: ${note.title}`,
            content: Buffer.from(fileContent).toString('base64'),
            branch,
            sha
        })
    } catch (e: unknown) {
      console.error(`Failed to push note ${note.id}`, e)
      const message = e instanceof Error ? e.message : String(e)
      errors.push(`Failed to push ${note.title}: ${message}`)
    }
  }

  // 3. Delete removed files
  const newFilenames = new Set(notes.map(n => {
     const slug = n.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled'
     return `notes/${n.id}-${slug}.md`
  }))

  const filesToDelete = currentFiles.filter(f => !newFilenames.has(f.path) && f.path.endsWith('.md'))

  for (const file of filesToDelete) {
    try {
      await octokit.rest.repos.deleteFile({
        owner,
        repo,
        path: file.path,
        message: `Delete note ${file.name}`,
        sha: file.sha,
        branch
      })
    } catch (e: unknown) {
      console.error(`Failed to delete file ${file.path}`, e)
      const message = e instanceof Error ? e.message : String(e)
      errors.push(`Failed to delete ${file.name}: ${message}`)
    }
  }

  if (errors.length > 0) {
      return new NextResponse(JSON.stringify({ success: false, errors }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
      })
  }

  return NextResponse.json({ success: true })
}