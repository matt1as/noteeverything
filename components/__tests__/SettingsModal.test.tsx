import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import SettingsModal from "../SettingsModal"
import type { PersistedGitHubConfig } from "@/types"

const mockUseSession = vi.fn()
const mockUseNotes = vi.fn()

vi.mock("next-auth/react", () => ({
  __esModule: true,
  useSession: () => mockUseSession(),
}))

vi.mock("../NotesContext", () => ({
  __esModule: true,
  useNotes: () => mockUseNotes(),
}))

const baseConfig: PersistedGitHubConfig = {
  owner: "tester",
  repo: "repo",
  branch: "main",
}

describe("SettingsModal", () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    })
    mockUseNotes.mockReturnValue({
      config: null,
      setConfig: vi.fn(),
      setNotes: vi.fn(),
      manualSync: vi.fn(),
      syncStatus: "idle",
      notes: [],
    })
  })

  it("renders nothing when closed", () => {
    const { container } = render(<SettingsModal isOpen={false} onClose={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it("prompts users to sign in before configuring", () => {
    render(<SettingsModal isOpen onClose={vi.fn()} />)
    expect(screen.getByText(/sign in to configure/i)).toBeInTheDocument()
  })

  it("saves configuration using the GitHub login", async () => {
    const setConfig = vi.fn()
    mockUseNotes.mockReturnValue({
      config: null,
      setConfig,
      setNotes: vi.fn(),
      manualSync: vi.fn(),
      syncStatus: "idle",
      notes: [],
    })

    mockUseSession.mockReturnValue({
      data: { user: { login: "octocat", name: "Octo" } },
      status: "authenticated",
    })

    const user = userEvent.setup()
    render(<SettingsModal isOpen onClose={vi.fn()} />)

    const repoInput = screen.getByPlaceholderText("note-everything")
    await user.clear(repoInput)
    await user.type(repoInput, "my-notes")

    const branchInput = screen.getByPlaceholderText("main")
    await user.clear(branchInput)
    await user.type(branchInput, "prod")

    await user.click(screen.getByText("Save Config"))

    expect(setConfig).toHaveBeenCalledWith({
      owner: "octocat",
      repo: "my-notes",
      branch: "prod",
    })
  })

  it("enables manual sync when config exists", async () => {
    const manualSync = vi.fn().mockResolvedValue(undefined)
    mockUseNotes.mockReturnValue({
      config: baseConfig,
      setConfig: vi.fn(),
      setNotes: vi.fn(),
      manualSync,
      syncStatus: "idle",
      notes: [],
    })

    mockUseSession.mockReturnValue({
      data: { user: { login: "octocat" } },
      status: "authenticated",
    })

    const user = userEvent.setup()
    render(<SettingsModal isOpen onClose={vi.fn()} />)

    const syncButton = screen.getByRole("button", { name: /sync now/i })
    expect(syncButton).not.toBeDisabled()
    await user.click(syncButton)
    expect(manualSync).toHaveBeenCalled()
  })
})
