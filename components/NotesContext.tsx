"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Note, PersistedGitHubConfig } from '@/types'

interface NotesContextType {
  notes: Note[]
  activeNoteId: string | null
  config: PersistedGitHubConfig | null
  isLoading: boolean
  addNote: (parentId?: string | null) => void
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => void
  setActiveNoteId: (id: string | null) => void
  setConfig: (config: PersistedGitHubConfig) => void
  setNotes: (notes: Note[]) => void
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

  return (
    <NotesContext.Provider
      value={{
        notes,
        activeNoteId,
        config,
        isLoading,
        addNote,
        updateNote,
        deleteNote,
        setActiveNoteId,
        setConfig,
        setNotes
      }}
    >
      {children}
    </NotesContext.Provider>
  )
}
