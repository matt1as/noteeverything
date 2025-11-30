"use client"

import { SessionProvider } from "next-auth/react"
import { NotesProvider } from "./NotesContext"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NotesProvider>
        {children}
      </NotesProvider>
    </SessionProvider>
  )
}
