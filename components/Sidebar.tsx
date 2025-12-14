"use client"

import React, { useState } from 'react'
import { useNotes } from './NotesContext'
import { ChevronRight, ChevronDown, Plus, Trash2, FileText, Settings, Github, LogOut, Cloud, CloudOff, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession, signIn, signOut } from 'next-auth/react'
import Image from 'next/image'

const NoteItem = ({ noteId, level = 0 }: { noteId: string, level?: number }) => {
  const { notes, activeNoteId, setActiveNoteId, addNote, deleteNote } = useNotes()
  const [isExpanded, setIsExpanded] = useState(true)

  const note = notes.find((n) => n.id === noteId)
  if (!note) return null

  const children = notes.filter((n) => n.parentId === noteId)
  const hasChildren = children.length > 0
  const isActive = activeNoteId === noteId

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation()
    addNote(noteId)
    setIsExpanded(true)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteNote(noteId)
  }

  return (
    <div className="select-none">
      <div
        className={cn(
          "group flex items-center px-2 py-1.5 mx-2 rounded-md text-sm transition-all duration-200 cursor-pointer mb-0.5 border border-transparent",
          isActive 
            ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm border-zinc-200 dark:border-zinc-700 font-medium" 
            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => setActiveNoteId(noteId)}
      >
        <div
          className={cn(
            "p-0.5 rounded hover:bg-zinc-300/50 dark:hover:bg-zinc-600 mr-1 transition-colors", 
            hasChildren ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={handleExpand}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        
        <FileText size={14} className={cn("mr-2", isActive ? "text-blue-500" : "text-zinc-400")} />
        <span className="flex-1 truncate">{note.title || 'Untitled'}</span>

        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <button onClick={handleAddChild} className="p-1 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded text-zinc-500" title="Add Child Note">
                <Plus size={12} />
            </button>
            <button onClick={handleDelete} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-zinc-400 hover:text-red-500 transition-colors" title="Delete">
                <Trash2 size={12} />
            </button>
        </div>
      </div>

      {isExpanded && children.map((child) => (
        <NoteItem key={child.id} noteId={child.id} level={level + 1} />
      ))}
    </div>
  )
}

export default function Sidebar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { notes, addNote, config, syncStatus, syncError } = useNotes()
  const { data: session } = useSession()

  const rootNotes = notes.filter((n) => !n.parentId)

  // Render sync status indicator
  const renderSyncStatus = () => {
    if (!config || !session) return null

    switch (syncStatus) {
      case 'syncing':
        return (
          <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-400">
            <Cloud size={12} className="mr-1.5 animate-pulse" />
            <span>Syncing...</span>
          </div>
        )
      case 'saved':
        return (
          <div className="flex items-center text-xs text-green-600 dark:text-green-400">
            <Check size={12} className="mr-1.5" />
            <span>All changes saved</span>
          </div>
        )
      case 'error':
        return (
          <div className="flex flex-col items-center text-xs text-red-600 dark:text-red-400">
            <div className="flex items-center">
              <CloudOff size={12} className="mr-1.5" />
              <span>Sync error</span>
            </div>
            {syncError && (
              <span className="text-[10px] mt-0.5 text-center max-w-full truncate" title={syncError}>
                {syncError}
              </span>
            )}
          </div>
        )
      default:
        return (
          <div className="flex items-center text-xs text-zinc-400 dark:text-zinc-500">
            <Cloud size={12} className="mr-1.5" />
            <span>Auto-sync enabled</span>
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col h-full border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 w-72 transition-colors duration-300">
      {/* Header */}
      <div className="p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 text-zinc-800 dark:text-zinc-100">
            <div className="w-6 h-6 bg-zinc-900 dark:bg-white rounded-md flex items-center justify-center">
                <span className="text-white dark:text-black font-bold text-xs">N</span>
            </div>
            <h1 className="font-semibold text-sm tracking-tight">NoteEverything</h1>
        </div>
        <button 
            onClick={() => addNote(null)} 
            className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md text-zinc-500 dark:text-zinc-400 transition-colors"
            title="New Note"
        >
            <Plus size={18} />
        </button>
      </div>

      {/* Note Tree */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {rootNotes.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-zinc-400 text-sm">
                <p>No notes yet</p>
                <button onClick={() => addNote(null)} className="mt-2 text-blue-500 hover:underline">Create one</button>
            </div>
        )}
        {rootNotes.map((note) => (
          <NoteItem key={note.id} noteId={note.id} />
        ))}
      </div>

      {/* Footer / Profile */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 shrink-0">
        {session ? (
            <div className="flex flex-col space-y-3">
                {/* Sync Status */}
                <div className="flex items-center justify-center">
                    {renderSyncStatus()}
                </div>

                <div className="flex items-center justify-between group">
                    <div className="flex items-center overflow-hidden space-x-2.5">
                        {session.user?.image ? (
                            <Image 
                                src={session.user.image} 
                                alt="User Avatar" 
                                width={32} 
                                height={32} 
                                className="rounded-full border border-zinc-200 dark:border-zinc-700" 
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                        )}
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                {session.user?.name || 'User'}
                            </span>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                                {config?.repo || 'No Repo'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <button
                            onClick={onOpenSettings}
                            title="Open settings"
                            aria-label="Open settings"
                            className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md text-zinc-500 transition-colors"
                        >
                            <Settings size={16} />
                        </button>
                        <button
                            onClick={() => signOut()}
                            title="Sign out"
                            aria-label="Sign out"
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 rounded-md text-zinc-400 transition-colors"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </div>
        ) : (
            <button 
                onClick={() => signIn('github')}
                className="flex items-center justify-center w-full py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-md text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
            >
                <Github size={16} className="mr-2" />
                Sign in
            </button>
        )}
      </div>
    </div>
  )
}
