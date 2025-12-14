import { test, expect } from "@playwright/test"

test.describe("NoteEverything app shell", () => {
  test("loads home page and creates a local note", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByText("NoteEverything").first()).toBeVisible()
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()

    await page.getByTitle("New Note").click()

    const titleInput = page.getByPlaceholder("Untitled Note")
    await expect(titleInput).toBeVisible()
    await titleInput.fill("Playwright Note")

    await expect(page.getByText("Playwright Note").first()).toBeVisible()

    await page.waitForFunction(() => {
      const raw = localStorage.getItem("note-everything-notes")
      if (!raw) return false
      try {
        const notes = JSON.parse(raw)
        return Array.isArray(notes) && notes.some((n: { title?: string }) => n.title === "Playwright Note")
      } catch {
        return false
      }
    })
  })
})
