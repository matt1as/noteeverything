"use client"

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Editor from '@/components/Editor'
import SettingsModal from '@/components/SettingsModal'

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <div className="flex h-screen w-full">
      <Sidebar onOpenSettings={() => setIsSettingsOpen(true)} />
      <main className="flex-1 h-full overflow-hidden bg-white dark:bg-black">
        <Editor />
      </main>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}