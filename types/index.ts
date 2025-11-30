export interface Note {
  id: string
  title: string
  content: string // HTML content
  createdAt: string // ISO string
  updatedAt: string // ISO string
  parentId?: string | null
}

export interface PersistedGitHubConfig {
  owner: string
  repo: string
  branch: string // default 'main'
}
