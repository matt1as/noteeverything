"use client"

import { useState, useEffect } from 'react'
import { useNotes } from './NotesContext'
import { useSession } from 'next-auth/react'
import { X, Loader2, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { config, setConfig, setNotes, manualSync, syncStatus } = useNotes()
  const { data: session } = useSession()

  const [repoName, setRepoName] = useState(config?.repo || '')
  const [branch, setBranch] = useState(config?.branch || 'main')
  const [status, setStatus] = useState<{type: 'success' | 'error', message: string} | null>(null)

  // Update local state when config changes
  useEffect(() => {
    if (config) {
      setRepoName(config.repo)
      setBranch(config.branch)
    }
  }, [config])

  if (!isOpen) return null

  const handleSaveConfig = () => {
    // Use type assertion for session user properties
    const user = session?.user as { login?: string; name?: string } | undefined
    const owner = user?.login || user?.name 
    
    setConfig({
      owner: owner || 'unknown',
      repo: repoName,
      branch: branch
    })
    setStatus({ type: 'success', message: 'Configuration saved' })
    setTimeout(() => setStatus(null), 2000)
  }

  const handleManualSync = async () => {
    if (!config) return
    setStatus(null)
    try {
      await manualSync()
      setStatus({ type: 'success', message: 'Sync complete' })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      setStatus({ type: 'error', message })
    }
  }

  const handleRefresh = async () => {
    if (!config) return
    if (!confirm("This will refresh notes from cloud. Any unsaved local changes will be lost. Continue?")) return
    setStatus(null)
    try {
      const params = new URLSearchParams({
        owner: config.owner,
        repo: config.repo,
        branch: config.branch
      })
      const res = await fetch(`/api/github/pull?${params.toString()}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setNotes(data.notes)
      setStatus({ type: 'success', message: 'Notes refreshed from cloud' })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        setStatus({ type: 'error', message })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 border dark:border-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Settings</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        {!session ? (
            <div className="text-center py-8 text-gray-500">
                Please sign in to configure GitHub sync.
            </div>
        ) : (
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">GitHub Repository</label>
                    <div className="flex items-center space-x-2 text-gray-500 bg-gray-100 dark:bg-gray-800 p-2 rounded border border-transparent focus-within:border-black dark:focus-within:border-white">
                        {/* Use inline type assertion to access 'login' safely */}
                        <span>{((session?.user as unknown as { login: string })?.login || 'user')} /</span>
                        <input 
                            value={repoName}
                            onChange={(e) => setRepoName(e.target.value)}
                            className="bg-transparent focus:outline-none flex-1 text-black dark:text-white"
                            placeholder="note-everything"
                        />
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium mb-1">Branch (Advanced)</label>
                    <input 
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-gray-800 p-2 rounded border border-transparent focus:outline-none focus:border-black dark:focus:border-white"
                        placeholder="main"
                    />
                </div>

                <div className="flex space-x-2 pt-2">
                    <button 
                        onClick={handleSaveConfig}
                        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 text-sm font-medium"
                    >
                        Save Config
                    </button>
                </div>

                <hr className="my-4 border-gray-200 dark:border-gray-800" />

                <div className="space-y-2">
                    <h3 className="font-medium">Cloud Sync</h3>
                    <p className="text-xs text-gray-500">Notes auto-save to cloud. Manual controls below.</p>
                    <div className="flex space-x-2">
                        <button
                             onClick={handleManualSync}
                             disabled={syncStatus === 'syncing' || !config}
                             className="flex-1 border border-gray-300 dark:border-gray-700 px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 text-sm"
                        >
                            Sync Now
                        </button>
                        <button
                             onClick={handleRefresh}
                             disabled={syncStatus === 'syncing' || !config}
                             className="flex-1 border border-gray-300 dark:border-gray-700 px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 text-sm"
                        >
                            Refresh from Cloud
                        </button>
                    </div>
                </div>

                {status && (
                    <div className={cn("p-3 rounded text-sm flex items-center", status.type === 'success' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
                        {status.type === 'success' ? <Check size={16} className="mr-2" /> : <AlertCircle size={16} className="mr-2" />}
                        {status.message}
                    </div>
                )}

                 {syncStatus === 'syncing' && (
                     <div className="flex items-center justify-center text-sm text-gray-500">
                         <Loader2 size={16} className="animate-spin mr-2" />
                         Syncing...
                     </div>
                 )}
            </div>
        )}
      </div>
    </div>
  )
}