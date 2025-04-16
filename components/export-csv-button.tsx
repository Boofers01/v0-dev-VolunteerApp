"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import type { CardType, ListType } from "@/lib/types"

interface ExportCSVButtonProps {
  className?: string
}

export function ExportCSVButton({ className }: ExportCSVButtonProps) {
  const exportToCSV = () => {
    try {
      // Get data from localStorage
      const listsData = localStorage.getItem("volunteerTrackerLists")
      const volunteersData = localStorage.getItem("testVolunteers")

      if (!volunteersData) {
        alert("No volunteer data found to export.")
        return
      }

      const volunteers: CardType[] = JSON.parse(volunteersData)
      const lists: ListType[] = listsData ? JSON.parse(listsData) : []

      // Create a map of list IDs to list titles for reference
      const listMap = new Map<string, string>()
      lists.forEach((list) => {
        listMap.set(list.id, list.title)
      })

      // Create CSV header row
      const headers = ["ID", "Name", "Email", "Phone", "List", "Tags", "Roles", "Notes", "Created At"]

      // Create CSV rows for each volunteer
      const rows = volunteers.map((volunteer) => {
        const listName = volunteer.listId ? listMap.get(volunteer.listId) || "Unknown List" : "Unassigned"
        const tags = volunteer.tags ? volunteer.tags.join("; ") : ""
        const roles = volunteer.currentRoles ? volunteer.currentRoles.join("; ") : ""

        return [
          volunteer.id,
          volunteer.title,
          volunteer.email || "",
          volunteer.phone || "",
          listName,
          tags,
          roles,
          (volunteer.description || "").replace(/\n/g, " "), // Replace newlines with spaces
          volunteer.createdAt,
        ]
      })

      // Combine header and rows
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n")

      // Create a blob and download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")

      // Set up download
      const date = new Date().toISOString().split("T")[0]
      link.setAttribute("href", url)
      link.setAttribute("download", `volunteer-tracker-export-${date}.csv`)
      link.style.visibility = "hidden"

      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error exporting data:", error)
      alert("Failed to export data. See console for details.")
    }
  }

  return (
    <Button onClick={exportToCSV} variant="outline" className={className}>
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  )
}
