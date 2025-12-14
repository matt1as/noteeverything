import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Sidebar from "../Sidebar"
import type { Note } from "@/types"

const mockUseSession = vi.fn()
const mockUseNotes = vi.fn()
const mockSignIn = vi.fn()
const mockSignOut = vi.fn()

vi.mock("next-auth/react", () => ({
  __esModule: true,
  useSession: () => mockUseSession(),
  signIn: (...args: unknown[]) => mockSignIn(...(args as [])),
  signOut: (...args: unknown[]) => mockSignOut(...(args as [])),
}))

vi.mock("../NotesContext", () => ({
  __esModule: true,
  useNotes: () => mockUseNotes(),
}))

describe("Sidebar", () => {
  const createNotesValue = () => ({
    notes: [] as Note[],
    addNote: vi.fn(),
    deleteNote: vi.fn(),
    setActiveNoteId: vi.fn(),
    updateNote: vi.fn(),
    setConfig: vi.fn(),
    setNotes: vi.fn(),
    manualSync: vi.fn(),
    activeNoteId: null,
    config: null,
    isLoading: false,
    syncStatus: "idle",
    syncError: null,
  })

  beforeEach(() => {
    mockUseNotes.mockReturnValue({ ...createNotesValue() })
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    })
    mockSignIn.mockReset()
    mockSignOut.mockReset()
  })

  it("renders sign in button when session is missing", async () => {
    render(<Sidebar onOpenSettings={vi.fn()} />)

    expect(screen.getByText("Sign in")).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByTitle("New Note"))

    expect(mockUseNotes().addNote).toHaveBeenCalledWith(null)
  })

  it("shows sync state and note tree for authenticated users", async () => {
    const notes: Note[] = [
      { id: "root", title: "Root", content: "", createdAt: "", updatedAt: "", parentId: null },
      { id: "child", title: "Child", content: "", createdAt: "", updatedAt: "", parentId: "root" },
    ]

    mockUseNotes.mockReturnValue({
      ...createNotesValue(),
      notes,
      activeNoteId: "root",
      config: { owner: "me", repo: "repo", branch: "main" },
      syncStatus: "saved",
    })

    mockUseSession.mockReturnValue({
      data: { user: { name: "Tester", image: undefined }, accessToken: "token" },
      status: "authenticated",
    })

    const onOpenSettings = vi.fn()
    const user = userEvent.setup()
    render(<Sidebar onOpenSettings={onOpenSettings} />)

    expect(screen.getByText("All changes saved")).toBeInTheDocument()
    expect(screen.getByText("Root")).toBeInTheDocument()
    expect(screen.getByText("Child")).toBeInTheDocument()

    await user.click(screen.getByText("Root"))
    expect(mockUseNotes().setActiveNoteId).toHaveBeenCalledWith("root")

    const settingsButton = screen.getByRole("button", { name: /open settings/i })
    await user.click(settingsButton)
    expect(onOpenSettings).toHaveBeenCalled()

    const signOutButton = screen.getByRole("button", { name: /sign out/i })
    await user.click(signOutButton)
    expect(mockSignOut).toHaveBeenCalled()
  })
})
