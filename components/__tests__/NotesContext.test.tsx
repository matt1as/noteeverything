import { render, waitFor, act } from "@testing-library/react"
import React from "react"
import { NotesProvider, useNotes } from "../NotesContext"
import type { PersistedGitHubConfig } from "@/types"

const mockUseSession = vi.fn()

vi.mock("next-auth/react", () => ({
  __esModule: true,
  useSession: () => mockUseSession(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe("NotesProvider", () => {
  beforeEach(() => {
    localStorage.clear()
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    })
    // jsdom has fetch, but ensure we reset to default stub each test
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  function setup() {
    const contextRef: { current: ReturnType<typeof useNotes> | null } = { current: null }

    function Consumer() {
      const ctx = useNotes()
      React.useEffect(() => {
        contextRef.current = ctx
      }, [ctx])
      return null
    }

    render(
      <NotesProvider>
        <Consumer />
      </NotesProvider>,
    )

    return contextRef
  }

  async function waitForReadyContext(
    contextRef: { value: ReturnType<typeof useNotes> | null },
  ) {
    await waitFor(() => expect(contextRef.current).not.toBeNull())
    await waitFor(() => expect(contextRef.current?.notes.length).toBeGreaterThan(0))
    return contextRef.current!
  }

  it("creates a welcome note on first load", async () => {
    const contextRef = setup()

    const ctx = await waitForReadyContext(contextRef)

    expect(ctx.notes[0]).toMatchObject({
      id: "welcome",
      title: "Welcome to NoteEverything",
    })
    expect(ctx.activeNoteId).toBe("welcome")
  })

  it("can add and delete nested notes", async () => {
    const contextRef = setup()

    await waitForReadyContext(contextRef)
    const getCtx = () => contextRef.current!
    const parentId = getCtx().notes[0].id

    act(() => {
      getCtx().addNote(parentId)
    })

    await waitFor(() => expect(getCtx().notes.length).toBe(2))

    const child = getCtx().notes.find((note) => note.parentId === parentId)
    expect(child).toBeDefined()

    act(() => {
      getCtx().deleteNote(parentId)
    })

    await waitFor(() => expect(getCtx().notes.length).toBe(0))
    expect(getCtx().activeNoteId).toBeNull()
  })

  it("writes notes to GitHub when manualSync is triggered", async () => {
    mockUseSession.mockReturnValue({
      data: {
        accessToken: "token",
        user: { name: "Test", login: "tester" },
      },
      status: "authenticated",
    })

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
    global.fetch = mockFetch as unknown as typeof fetch

    const contextRef = setup()
    await waitForReadyContext(contextRef)
    const getCtx = () => contextRef.current!

    const config: PersistedGitHubConfig = {
      owner: "tester",
      repo: "notes",
      branch: "main",
    }

    act(() => {
      getCtx().setConfig(config)
    })

    act(() => {
      getCtx().addNote(null)
    })

    await waitFor(() => expect(getCtx().notes.length).toBeGreaterThan(1))

    const newNoteId = getCtx().activeNoteId!

    act(() => {
      getCtx().updateNote(newNoteId, { title: "My Note", content: "<p>hello</p>" })
    })

    await act(async () => {
      await getCtx().manualSync()
    })

    const postCalls = mockFetch.mock.calls.filter(([, init]) => init?.method === "POST")
    expect(postCalls.length).toBeGreaterThan(0)
    const [, requestInit] = postCalls[postCalls.length - 1]
    expect(requestInit?.method).toBe("POST")
    expect(requestInit?.headers).toMatchObject({ "Content-Type": "application/json" })
    const payload = JSON.parse(requestInit?.body as string)
    expect(payload.config).toMatchObject(config)
    expect(payload.notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "My Note", content: "<p>hello</p>" }),
      ]),
    )
  })
})
