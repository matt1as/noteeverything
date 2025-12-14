import { GET } from "./route"

const mockGetServerSession = vi.fn()
vi.mock("next-auth/next", () => ({
  __esModule: true,
  getServerSession: (...args: unknown[]) => mockGetServerSession(...(args as [])),
}))

const mockGetContent = vi.fn()

vi.mock("@octokit/rest", () => {
  const OctokitMock = vi.fn().mockImplementation(function () {
    return {
      rest: {
        repos: {
          getContent: (...args: unknown[]) => mockGetContent(...(args as [])),
        },
      },
    }
  })
  return { Octokit: OctokitMock }
})

describe("GitHub pull route", () => {
  beforeEach(() => {
    mockGetServerSession.mockReset()
    mockGetContent.mockReset()
  })

  it("returns 401 without a session", async () => {
    mockGetServerSession.mockResolvedValue(null)
    const request = new Request("http://localhost/api/github/pull?owner=me&repo=notes")
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it("returns parsed notes from GitHub", async () => {
    mockGetServerSession.mockResolvedValue({ accessToken: "token" })

    mockGetContent.mockImplementation(async ({ path }: { path: string }) => {
      if (path === "notes") {
        return {
          data: [
            { type: "file", path: "notes/note.md", name: "note.md" },
          ],
        }
      }
      const markdown = `---
id: '1'
title: Sample Note
createdAt: 2024-01-01T00:00:00.000Z
updatedAt: 2024-01-02T00:00:00.000Z
parentId: null
---

# Hello world
`
      return {
        data: {
          content: Buffer.from(markdown, "utf-8").toString("base64"),
        },
      }
    })

    const request = new Request("http://localhost/api/github/pull?owner=me&repo=notes")
    const response = await GET(request)
    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data.notes).toHaveLength(1)
    expect(data.notes[0]).toMatchObject({
      id: "1",
      title: "Sample Note",
      parentId: null,
    })
    expect(data.notes[0].content).toContain("<h1>Hello world</h1>")
  })

  it("returns empty array when repo is empty", async () => {
    mockGetServerSession.mockResolvedValue({ accessToken: "token" })
    mockGetContent.mockResolvedValue({ data: [] })
    const request = new Request("http://localhost/api/github/pull?owner=me&repo=notes")
    const response = await GET(request)
    const data = await response.json()
    expect(data.notes).toEqual([])
  })
})
