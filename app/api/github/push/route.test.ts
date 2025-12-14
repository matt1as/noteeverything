import { POST } from "./route"
import type { Note, PersistedGitHubConfig } from "@/types"

const mockGetServerSession = vi.fn()
vi.mock("next-auth/next", () => ({
  __esModule: true,
  getServerSession: (...args: unknown[]) => mockGetServerSession(...(args as [])),
}))

const mockGetContent = vi.fn()
const mockCreateOrUpdate = vi.fn()
const mockDeleteFile = vi.fn()

vi.mock("@octokit/rest", () => {
  const OctokitMock = vi.fn().mockImplementation(function () {
    return {
      rest: {
        repos: {
          getContent: (...args: unknown[]) => mockGetContent(...(args as [])),
          createOrUpdateFileContents: (...args: unknown[]) => mockCreateOrUpdate(...(args as [])),
          deleteFile: (...args: unknown[]) => mockDeleteFile(...(args as [])),
        },
      },
    }
  })
  return { Octokit: OctokitMock }
})

describe("GitHub push route", () => {
  beforeEach(() => {
    mockGetServerSession.mockReset()
    mockGetContent.mockReset()
    mockCreateOrUpdate.mockReset()
    mockDeleteFile.mockReset()
  })

  it("rejects unauthenticated users", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const config: PersistedGitHubConfig = { owner: "me", repo: "notes", branch: "main" }
    const request = new Request("http://localhost/api/github/push", {
      method: "POST",
      body: JSON.stringify({ config, notes: [] }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    expect(mockCreateOrUpdate).not.toHaveBeenCalled()
  })

  it("creates markdown files for notes and deletes removed ones", async () => {
    mockGetServerSession.mockResolvedValue({
      accessToken: "token",
    })

    mockGetContent.mockImplementation(async ({ path }: { path: string }) => {
      if (path === "notes") {
        return {
          data: [
            {
              type: "file",
              path: "notes/orphan.md",
              sha: "sha-old",
              name: "orphan.md",
            },
          ],
        }
      }
      return { data: [] }
    })

    mockCreateOrUpdate.mockResolvedValue({})
    mockDeleteFile.mockResolvedValue({})

    const notes: Note[] = [
      {
        id: "1",
        title: "Parent Note",
        content: "<p>Hello</p>",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        parentId: null,
      },
      {
        id: "2",
        title: "Child Note",
        content: "<p>Child</p>",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        parentId: "1",
      },
    ]

    const config: PersistedGitHubConfig = { owner: "me", repo: "notes", branch: "main" }
    const request = new Request("http://localhost/api/github/push", {
      method: "POST",
      body: JSON.stringify({ config, notes }),
      headers: { "Content-Type": "application/json" },
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toEqual({ success: true })

    expect(mockCreateOrUpdate).toHaveBeenCalledTimes(2)
    const createdPaths = mockCreateOrUpdate.mock.calls.map(([params]) => (params as { path: string }).path)
    expect(createdPaths).toEqual(expect.arrayContaining(["notes/parent-note.md", "notes/parent-note/child-note.md"]))

    const deleteParams = mockDeleteFile.mock.calls[0][0] as { path: string; sha: string }
    expect(deleteParams.path).toBe("notes/orphan.md")
    expect(deleteParams.sha).toBe("sha-old")
  })
})
