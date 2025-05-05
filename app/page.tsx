"use client"

import { useState, useEffect } from "react"
import { KanbanBoard } from "@/components/kanban-board"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Bug, ClipboardList, Database } from "lucide-react"
import Link from "next/link"
import { ExportCSVButton } from "@/components/export-csv-button"
import { DataPersistenceDialog } from "@/components/data-persistence-dialog"

export default function Home() {
  const [newListTitle, setNewListTitle] = useState("")
  const [isDataDialogOpen, setIsDataDialogOpen] = useState(false)

  const handleAddList = () => {
    if (newListTitle.trim() === "") return

    // Dispatch a custom event to add a new list
    const event = new CustomEvent("addNewList", { detail: newListTitle })
    window.dispatchEvent(event)

    // Clear the input
    setNewListTitle("")
  }

  // Add an effect to listen for the saveAllData event
  useEffect(() => {
    const handleSaveAllData = () => {
      // Dispatch a custom event to save all data
      const event = new CustomEvent("saveAllData")
      window.dispatchEvent(event)
    }

    window.addEventListener("saveAllData", handleSaveAllData)

    return () => {
      window.removeEventListener("saveAllData", handleSaveAllData)
    }
  }, [])

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100">
      <div className="px-4 py-3 flex-shrink-0 border-b border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Volunteer Tracker</h1>
            <p className="text-sm text-gray-600">Manage volunteer applications and onboarding</p>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <div className="flex gap-2 w-full md:w-auto">
              <Input
                placeholder="New list title"
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddList()}
                className="w-full sm:w-auto"
              />
              <Button onClick={handleAddList} className="flex-shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                Add List
              </Button>
            </div>
            <Link href="/csv-import">
              <Button variant="outline">Import CSV</Button>
            </Link>
            <ExportCSVButton />
            <Button variant="outline" className="flex items-center gap-2" onClick={() => setIsDataDialogOpen(true)}>
              <Database className="h-4 w-4" />
              Backup/Restore
            </Button>
            <Link href="/checklist">
              <Button variant="outline">
                <ClipboardList className="h-4 w-4 mr-2" />
                Master Checklist
              </Button>
            </Link>
            <Link href="/debug-logs">
              <Button variant="outline">
                <Bug className="h-4 w-4 mr-2" />
                Debug Logs
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-hidden">
        <KanbanBoard newListTitleState={[newListTitle, setNewListTitle]} />
      </div>

      <DataPersistenceDialog isOpen={isDataDialogOpen} onClose={() => setIsDataDialogOpen(false)} />
    </div>
  )
}
