"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Note, PersistedGitHubConfig } from '@/types'
import { useSession } from 'next-auth/react'

type SyncStatus = 'idle' | 'syncing' | 'saved' | 'error'

interface NotesContextType {
  notes: Note[]
  activeNoteId: string | null
  config: PersistedGitHubConfig | null
  isLoading: boolean
  syncStatus: SyncStatus
  syncError: string | null
  addNote: (parentId?: string | null) => void
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => void
  setActiveNoteId: (id: string | null) => void
  setConfig: (config: PersistedGitHubConfig) => void
  setNotes: (notes: Note[]) => void
  manualSync: () => Promise<void>
}

const NotesContext = createContext<NotesContextType | undefined>(undefined)

export const useNotes = () => {
  const context = useContext(NotesContext)
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider')
  }
  return context
}

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotesState] = useState<Note[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [config, setConfigState] = useState<PersistedGitHubConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [syncError, setSyncError] = useState<string | null>(null)
  const { data: session } = useSession()
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInitialLoadRef = useRef(true)
  const notesRef = useRef<Note[]>(notes)
  const lastSyncedNotesRef = useRef<string>('') // Store hash of last synced state
  const isDirtyRef = useRef(false)
  const isMountedRef = useRef(true)
  const autoPullRef = useRef<() => Promise<void>>(async () => {})

  const AUTO_PULL_INTERVAL_MS = 60_000

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('note-everything-notes')
    const savedConfig = localStorage.getItem('note-everything-config')
    const savedActiveId = localStorage.getItem('note-everything-active-id')
    const savedHash = localStorage.getItem('note-everything-last-synced-hash')

    if (savedNotes) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNotesState(JSON.parse(savedNotes))
      } catch (e) {
        console.error('Failed to parse notes', e)
      }
    } else {
      // Welcome note for first-time users
      const welcomeNote: Note = {
        id: 'welcome',
        title: 'Welcome to NoteEverything',
        content: '<h1>Welcome!</h1><p>Start writing your notes here...</p>',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        parentId: null
      }
      setNotesState([welcomeNote])
      setActiveNoteId('welcome')
    }

    if (savedConfig) {
      try {
        setConfigState(JSON.parse(savedConfig))
      } catch (e) {
        console.error('Failed to parse config', e)
      }
    }

    if (savedActiveId) {
        setActiveNoteId(savedActiveId)
    }

    if (savedHash) {
      lastSyncedNotesRef.current = savedHash
    }

    setIsLoading(false)
  }, [])

  // Save to LocalStorage on change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('note-everything-notes', JSON.stringify(notes))
    }
  }, [notes, isLoading])

  useEffect(() => {
    if (!isLoading && config) {
      localStorage.setItem('note-everything-config', JSON.stringify(config))
    }
  }, [config, isLoading])

  useEffect(() => {
      if(!isLoading) {
          if(activeNoteId) {
            localStorage.setItem('note-everything-active-id', activeNoteId)
          } else {
            localStorage.removeItem('note-everything-active-id')
          }
      }
  }, [activeNoteId, isLoading])


  const addNote = useCallback((parentId: string | null = null) => {
    isDirtyRef.current = true
    const newNote: Note = {
      id: uuidv4(),
      title: 'New Note',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parentId,
    }
    setNotesState((prev) => [...prev, newNote])
    setActiveNoteId(newNote.id)
  }, [])

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    isDirtyRef.current = true
    setNotesState((prev) =>
      prev.map((note) =>
        note.id === id
          ? { ...note, ...updates, updatedAt: new Date().toISOString() }
          : note
      )
    )
  }, [])

  const deleteNote = useCallback((id: string) => {
    isDirtyRef.current = true
    setNotesState((prev) => {
      // Recursive delete
      const idsToDelete = new Set<string>([id])
      
      const findChildren = (parentId: string) => {
        prev.forEach(n => {
          if (n.parentId === parentId) {
            idsToDelete.add(n.id)
            findChildren(n.id)
          }
        })
      }
      findChildren(id)

      return prev.filter((n) => !idsToDelete.has(n.id))
    })
    if (activeNoteId === id) {
      setActiveNoteId(null)
    }
  }, [activeNoteId])

  const setConfig = useCallback((newConfig: PersistedGitHubConfig) => {
    setConfigState(newConfig)
  }, [])

  const setNotes = useCallback((newNotes: Note[]) => {
      setNotesState(newNotes)
  }, [])

  // Keep notesRef up to date
  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  // Auto-sync to GitHub with debouncing
  const syncToGitHub = useCallback(async () => {
    if (!config || !session) return

    const currentNotes = notesRef.current
    const notesHash = JSON.stringify(currentNotes)

    // Skip if notes haven't changed since last sync
    if (notesHash === lastSyncedNotesRef.current) return

    setSyncStatus('syncing')
    setSyncError(null)

    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: currentNotes, config })
      })

      if (!isMountedRef.current) return

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.errors ? data.errors.join('\n') : await res.text())
      }

      lastSyncedNotesRef.current = notesHash
      localStorage.setItem('note-everything-last-synced-hash', notesHash)
      isDirtyRef.current = false // Reset after successful sync
      setSyncStatus('saved')

      // Reset to idle after 2 seconds with cleanup tracking
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current)
      resetTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) setSyncStatus('idle')
      }, 2000)
    } catch (e: unknown) {
      if (!isMountedRef.current) return
      const message = e instanceof Error ? e.message : 'Sync failed'
      setSyncError(message)
      setSyncStatus('error')
      console.error('Auto-sync failed:', message)
    }
  }, [config, session])

  // Debounced auto-sync when notes change
  useEffect(() => {
    // Skip auto-sync during initial load to prevent syncing localStorage data
    if (isLoading || !config || !session || isInitialLoadRef.current) return

    // Clear existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    // Set new timeout for auto-sync (5 seconds to avoid rate limiting)
    syncTimeoutRef.current = setTimeout(() => {
      syncToGitHub()
    }, 5000)

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current)
      }
    }
  }, [notes, config, session, isLoading, syncToGitHub])

  // Auto-pull function
  const autoPull = useCallback(async () => {
    if (!config || !session) return

    try {
      const params = new URLSearchParams({
        owner: config.owner,
        repo: config.repo,
        branch: config.branch
      })
      const res = await fetch(`/api/github/pull?${params.toString()}`)
      
      if (!isMountedRef.current) return

      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()

      if (data.notes) {
        const currentNotes = notesRef.current
        const currentHash = JSON.stringify(currentNotes)
        
        // Check if local notes are effectively "clean" (match last known sync state)
        // This allows us to pull updates if the user hasn't made "offline" changes
        // that deviate from what we last saw.
        const isSynced = currentHash === lastSyncedNotesRef.current

        if (isDirtyRef.current) {
          console.log('Skipping auto-pull: local changes detected (dirty flag)')
          return
        }

        const isEmpty = currentNotes.length === 0
        const isWelcome = currentNotes.length === 1 && currentNotes[0]?.id === 'welcome'

        // Only auto-pull if:
        // 1. We are in sync with what we last saw (safe update), OR
        // 2. Local is empty/welcome (safe init)
        if (isSynced || isEmpty || isWelcome) {
          
          // Prevent wiping Welcome note if cloud is empty
          if (data.notes.length === 0 && currentNotes.length > 0) {
            console.log('Skipping auto-pull: cloud is empty, preserving Welcome note')
            return
          }

          // Safe to pull
          setNotesState(data.notes)
          const newHash = JSON.stringify(data.notes)
          lastSyncedNotesRef.current = newHash
          localStorage.setItem('note-everything-last-synced-hash', newHash)
          console.log('Auto-pull successful')
        } else {
          // User has local data that is NOT marked dirty but ALSO doesn't match last sync.
          // This implies "Offline Changes" from a previous session that weren't synced.
          // We skip pull to avoid data loss.
          console.log('Skipping auto-pull: local notes exist and do not match last sync state')
        }
      }
    } catch (e: unknown) {
      console.log('Auto-pull skipped or failed:', e)
      // Silently fail - user can manually sync if needed
    }
  }, [config, session])

  // Update autoPullRef whenever autoPull changes
  useEffect(() => {
    autoPullRef.current = autoPull
  }, [autoPull])

  // Auto-pull on mount (after initial load), on config change, and periodically
  useEffect(() => {
    if (isLoading || !config || !session) return

    // Initial/Config-change pull
    autoPullRef.current()

    // Mark initial load as complete (if relevant for other logic, though less used now)
    isInitialLoadRef.current = false

    // Periodic pull
    const intervalId = setInterval(() => {
      autoPullRef.current()
    }, AUTO_PULL_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [config, session, isLoading]) // Stable dependencies

  // Manual sync function
  const manualSync = useCallback(async () => {
    await syncToGitHub()
  }, [syncToGitHub])

  return (
    <NotesContext.Provider
      value={{
        notes,
        activeNoteId,
        config,
        isLoading,
        syncStatus,
        syncError,
        addNote,
        updateNote,
        deleteNote,
        setActiveNoteId,
        setConfig,
        setNotes,
        manualSync
      }}
    >
      {children}
    </NotesContext.Provider>
  )
}
