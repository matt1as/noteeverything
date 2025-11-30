import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Octokit } from "@octokit/rest"
import { marked } from "marked"
import matter from "gray-matter"
import { Note } from "@/types"
import { NextResponse } from "next/server"

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
    const { data: files } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'notes',
      ref: branch
    })

    if (!Array.isArray(files)) {
      return NextResponse.json({ notes: [] })
    }

    const notes: Note[] = []

    await Promise.all(files.map(async (file) => {
      if (file.type !== 'file' || !file.name.endsWith('.md')) return

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
             title: frontmatter.title || file.name,
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