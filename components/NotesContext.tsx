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
  const hasLoadedRef = useRef(false)
  const isInitialLoadRef = useRef(true)
  const notesRef = useRef<Note[]>(notes)
  const lastSyncedNotesRef = useRef<string>('') // Store hash of last synced state

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('note-everything-notes')
    const savedConfig = localStorage.getItem('note-everything-config')
    const savedActiveId = localStorage.getItem('note-everything-active-id')

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
    setNotesState((prev) =>
      prev.map((note) =>
        note.id === id
          ? { ...note, ...updates, updatedAt: new Date().toISOString() }
          : note
      )
    )
  }, [])

  const deleteNote = useCallback((id: string) => {
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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.errors ? data.errors.join('\n') : await res.text())
      }

      lastSyncedNotesRef.current = notesHash
      setSyncStatus('saved')

      // Reset to idle after 2 seconds with cleanup tracking
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current)
      resetTimeoutRef.current = setTimeout(() => setSyncStatus('idle'), 2000)
    } catch (e: unknown) {
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

  // Auto-pull on mount (after initial load) with conflict detection
  useEffect(() => {
    const autoPull = async () => {
      if (!config || !session || hasLoadedRef.current) return

      hasLoadedRef.current = true

      try {
        const params = new URLSearchParams({
          owner: config.owner,
          repo: config.repo,
          branch: config.branch
        })
        const res = await fetch(`/api/github/pull?${params.toString()}`)
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()

        if (data.notes) {
          const currentNotes = notesRef.current

          // Only auto-pull if local notes are empty or just the welcome note
          // This prevents overwriting unsaved local changes
          if (currentNotes.length === 0 || (currentNotes.length === 1 && currentNotes[0]?.id === 'welcome')) {
            // Safe to pull - no user data yet (allows syncing empty arrays too)
            setNotesState(data.notes)
            lastSyncedNotesRef.current = JSON.stringify(data.notes)
          } else {
            // User has local data - skip auto-pull to prevent data loss
            // They can manually use "Refresh from Cloud" if needed
            console.log('Skipping auto-pull: local notes exist')
          }
        }
      } catch (e: unknown) {
        console.log('Auto-pull skipped or failed:', e)
        // Silently fail - user can manually sync if needed
      } finally {
        // Mark initial load as complete after auto-pull attempt
        isInitialLoadRef.current = false
      }
    }

    if (!isLoading) {
      autoPull()
    }
  }, [config, session, isLoading])

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
