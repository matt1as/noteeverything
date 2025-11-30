import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Octokit } from "@octokit/rest"
import TurndownService from "turndown"
import matter from "gray-matter"
import { Note, PersistedGitHubConfig } from "@/types"
import { NextResponse } from "next/server"

const turndownService = new TurndownService()

// Helper function to build file path based on note hierarchy
function buildNotePath(note: Note, notes: Note[], usedPaths: Set<string>): string {
  const sanitizeSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled'

  // Build path from root to current note by traversing parent chain
  const pathSegments: string[] = []
  let currentNote: Note | undefined = note
  const visitedIds = new Set<string>() // Prevent infinite loops

  while (currentNote && !visitedIds.has(currentNote.id)) {
    visitedIds.add(currentNote.id)
    const slug = sanitizeSlug(currentNote.title)
    pathSegments.unshift(slug)

    if (currentNote.parentId) {
      currentNote = notes.find(n => n.id === currentNote!.parentId)
    } else {
      break
    }
  }

  // Build the full path: notes/parent1/parent2/note-title.md
  const basePath = 'notes/' + pathSegments.join('/')
  let finalPath = basePath + '.md'

  // Handle filename collisions by appending a counter
  let counter = 1
  while (usedPaths.has(finalPath)) {
    const pathWithoutExt = basePath
    finalPath = `${pathWithoutExt}-${counter}.md`
    counter++
  }

  usedPaths.add(finalPath)
  return finalPath
}

// Helper function to recursively get all files in a directory
async function getAllFilesRecursive(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<any[]> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch
    })

    if (!Array.isArray(data)) return []

    const allFiles: any[] = []

    for (const item of data) {
      if (item.type === 'file') {
        allFiles.push(item)
      } else if (item.type === 'dir') {
        const subFiles = await getAllFilesRecursive(octokit, owner, repo, item.path, branch)
        allFiles.push(...subFiles)
      }
    }

    return allFiles
  } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (e.status === 404) return []
    throw e
  }
}

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

  // 1. Get all current files recursively in notes/ directory to find deletions and SHAs
  let currentFiles: any[] = []
  try {
    currentFiles = await getAllFilesRecursive(octokit, owner, repo, 'notes', branch)
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
  const usedPaths = new Set<string>()
  const pathMap = new Map<string, string>() // Map note.id to its path

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

        // Build meaningful path based on hierarchy
        const filename = buildNotePath(note, notes, usedPaths)
        pathMap.set(note.id, filename)

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

  // 3. Delete removed files (files that exist in GitHub but not in current notes)
  const newFilenames = new Set(Array.from(pathMap.values()))
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