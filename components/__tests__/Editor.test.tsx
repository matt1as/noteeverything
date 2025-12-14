import { render, screen, fireEvent, act } from "@testing-library/react"
import Editor from "../Editor"
import type { Note } from "@/types"
import type { UseEditorOptions } from "@tiptap/react"

const mockUseNotes = vi.fn()
vi.mock("../NotesContext", () => ({
  __esModule: true,
  useNotes: () => mockUseNotes(),
}))

const mockEditor = {
  commands: {
    setContent: vi.fn(),
  },
}

let lastOnUpdate: UseEditorOptions["onUpdate"] | null = null

vi.mock("@tiptap/react", () => ({
  __esModule: true,
  useEditor: (options?: UseEditorOptions | null) => {
    lastOnUpdate = options?.onUpdate ?? null
    return mockEditor
  },
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div data-testid="editor-content" data-editor={Boolean(editor)} />
  ),
}))

describe("Editor", () => {
  beforeEach(() => {
    mockUseNotes.mockReset()
    mockEditor.commands.setContent.mockReset()
    lastOnUpdate = null
  })

  it("renders placeholder when no note is active", () => {
    mockUseNotes.mockReturnValue({
      notes: [],
      activeNoteId: null,
      updateNote: vi.fn(),
    })

    render(<Editor />)
    expect(screen.getByText(/select a note to view/i)).toBeInTheDocument()
  })

  it("allows editing the active note title", () => {
    const updateNote = vi.fn()
    const notes: Note[] = [
      {
        id: "1",
        title: "First Note",
        content: "<p>hello</p>",
        createdAt: "",
        updatedAt: "",
        parentId: null,
      },
    ]

    mockUseNotes.mockReturnValue({
      notes,
      activeNoteId: "1",
      updateNote,
    })

    render(<Editor />)
    const titleInput = screen.getByPlaceholderText("Untitled Note") as HTMLInputElement
    fireEvent.change(titleInput, { target: { value: "Updated Title" } })
    expect(updateNote).toHaveBeenCalledWith("1", { title: "Updated Title" })
    expect(screen.getByTestId("editor-content")).toBeInTheDocument()
  })

  it("writes editor content changes through onUpdate", () => {
    const updateNote = vi.fn()
    const notes: Note[] = [
      {
        id: "2",
        title: "Second Note",
        content: "<p>hello</p>",
        createdAt: "",
        updatedAt: "",
        parentId: null,
      },
    ]

    mockUseNotes.mockReturnValue({
      notes,
      activeNoteId: "2",
      updateNote,
    })

    render(<Editor />)

    act(() => {
      lastOnUpdate?.({
        editor: {
          getHTML: () => "<p>updated</p>",
        },
      })
    })

    expect(updateNote).toHaveBeenCalledWith("2", { content: "<p>updated</p>" })
  })
})
