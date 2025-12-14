import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Octokit } from "@octokit/rest"
import { marked } from "marked"
import matter from "gray-matter"
import { Note } from "@/types"
import { NextResponse } from "next/server"

type RepoContentItem = {
  type: "file" | "dir"
  path: string
  name: string
  sha?: string
  content?: string
}

// Helper function to recursively get all files in a directory
async function getAllFilesRecursive(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<RepoContentItem[]> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch
    })

    if (!Array.isArray(data)) return []

    const allFiles: RepoContentItem[] = []

    for (const item of data) {
      if (item.type === 'file') {
        allFiles.push(item)
      } else if (item.type === 'dir') {
        const subFiles = await getAllFilesRecursive(octokit, owner, repo, item.path, branch)
        allFiles.push(...subFiles)
      }
    }

    return allFiles
  } catch (e: unknown) {
    if (typeof e === "object" && e && "status" in e) {
      const { status } = e as { status?: number }
      if (status === 404) {
        return []
      }
    }
    throw e
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.accessToken) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const owner = searchParams.get('owner')
  const repo = searchParams.get('repo')
  const branch = searchParams.get('branch') || 'main'

  if (!owner || !repo) {
    return new NextResponse("Missing owner or repo", { status: 400 })
  }

  const octokit = new Octokit({
    auth: session.accessToken
  })

  try {
    // Recursively get all markdown files from the notes directory
    const files = await getAllFilesRecursive(octokit, owner, repo, 'notes', branch)

    if (!files || files.length === 0) {
      return NextResponse.json({ notes: [] })
    }

    const notes: Note[] = []

    // Filter for markdown files only
    const markdownFiles = files.filter(f => f.name.endsWith('.md'))

    await Promise.all(markdownFiles.map(async (file) => {
      try {
        const { data: fileData } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: file.path,
          ref: branch
        })

        if ('content' in fileData && fileData.content) {
           const content = Buffer.from(fileData.content, 'base64').toString('utf-8')
           const { data: frontmatter, content: markdownBody } = matter(content)

           const htmlContent = await marked.parse(markdownBody)

           notes.push({
             id: frontmatter.id || file.name.replace('.md', ''),
             title: frontmatter.title || file.name.replace('.md', ''),
             content: htmlContent,
             createdAt: frontmatter.createdAt || new Date().toISOString(),
             updatedAt: frontmatter.updatedAt || new Date().toISOString(),
             parentId: frontmatter.parentId || null
           })
        }
      } catch (e) {
        console.error(`Failed to fetch/parse ${file.name}`, e)
      }
    }))

    return NextResponse.json({ notes })

  } catch (e: unknown) {
    const error = e as { status?: number; message?: string }
    if (error.status === 404) {
        return NextResponse.json({ notes: [] })
    }
    return new NextResponse(error.message || String(e), { status: 500 })
  }
}
