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
  const hasLoadedRef = useRef(false)

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

  // Auto-sync to GitHub with debouncing
  const syncToGitHub = useCallback(async () => {
    if (!config || !session) return

    setSyncStatus('syncing')
    setSyncError(null)

    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, config })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.errors ? data.errors.join('\n') : await res.text())
      }

      setSyncStatus('saved')
      // Reset to idle after 2 seconds
      setTimeout(() => setSyncStatus('idle'), 2000)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Sync failed'
      setSyncError(message)
      setSyncStatus('error')
      console.error('Auto-sync failed:', message)
    }
  }, [notes, config, session])

  // Debounced auto-sync when notes change
  useEffect(() => {
    if (isLoading || !config || !session) return

    // Clear existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    // Set new timeout for auto-sync (3 seconds after last change)
    syncTimeoutRef.current = setTimeout(() => {
      syncToGitHub()
    }, 3000)

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [notes, config, session, isLoading, syncToGitHub])

  // Auto-pull on mount (after initial load)
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

        if (data.notes && data.notes.length > 0) {
          setNotesState(data.notes)
        }
      } catch (e: unknown) {
        console.log('Auto-pull skipped or failed:', e)
        // Silently fail - user can manually sync if needed
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
