"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef } from 'react'
import { useNotes } from './NotesContext'

export default function Editor() {
  const { activeNoteId, notes, updateNote } = useNotes()
  
  const activeNote = notes.find(n => n.id === activeNoteId)
  const previousNoteIdRef = useRef<string | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing...',
        emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-zinc-400 before:float-left before:h-0 before:pointer-events-none',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-zinc dark:prose-invert prose-lg max-w-none focus:outline-none min-h-[500px]',
      },
    },
    content: activeNote?.content || '',
    onUpdate: ({ editor }) => {
      if (activeNoteId) {
        updateNote(activeNoteId, { content: editor.getHTML() })
      }
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    if (editor && activeNote) {
       if (activeNote.id !== previousNoteIdRef.current) {
          editor.commands.setContent(activeNote.content)
          previousNoteIdRef.current = activeNote.id
       }
    }
  }, [activeNoteId, activeNote, editor])

  if (!activeNote) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-400 bg-white dark:bg-black transition-colors duration-300">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15h6"/></svg>
        </div>
        <p className="text-lg font-medium text-zinc-500">Select a note to view</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-black transition-colors duration-300">
      <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-3xl mx-auto px-8 py-12">
            {/* Title Input */}
            <input
              type="text"
              value={activeNote.title}
              onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
              className="text-4xl font-bold w-full bg-transparent focus:outline-none placeholder-zinc-300 dark:placeholder-zinc-700 mb-8 text-zinc-900 dark:text-zinc-100"
              placeholder="Untitled Note"
            />
            
            {/* Editor */}
            <EditorContent editor={editor} className="w-full pb-32" />
          </div>
      </div>
    </div>
  )
}
