"use client"

import { Badge } from "@/components/ui/badge"

import { useRef } from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Download, FileText, MoveUp } from "lucide-react"
import Link from "next/link"
import type { CardType } from "@/lib/types"
import { DndProvider, useDrag, useDrop } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Define available fields for the report
const AVAILABLE_FIELDS = [
  { id: "name", label: "Name", default: true },
  { id: "email", label: "Email", default: true },
  { id: "phone", label: "Phone", default: true },
  { id: "list", label: "List", default: true },
  { id: "roles", label: "Roles", default: true },
  { id: "tags", label: "Tags", default: true },
  { id: "notes", label: "Notes", default: false },
  { id: "createdAt", label: "Created Date", default: false },
  { id: "checklistProgress", label: "Checklist Progress", default: false },
  { id: "attachments", label: "Has Attachments", default: false },
]

// Field item component with drag and drop
interface FieldItemProps {
  field: { id: string; label: string; enabled: boolean }
  index: number
  moveField: (dragIndex: number, hoverIndex: number) => void
  toggleField: (id: string) => void
}

function FieldItem({ field, index, moveField, toggleField }: FieldItemProps) {
  const ref = useRef<HTMLDivElement>(null)

  const [{ isDragging }, drag] = useDrag({
    type: "FIELD",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [, drop] = useDrop({
    accept: "FIELD",
    hover: (draggedItem: { index: number }, monitor) => {
      if (!ref.current) return

      const dragIndex = draggedItem.index
      const hoverIndex = index

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) return

      moveField(dragIndex, hoverIndex)
      draggedItem.index = hoverIndex
    },
  })

  drag(drop(ref))

  return (
    <div
      ref={ref}
      className={`flex items-center justify-between p-3 border rounded-md mb-2 ${
        isDragging ? "opacity-50" : "opacity-100"
      } ${field.enabled ? "bg-white" : "bg-gray-50"}`}
    >
      <div className="flex items-center gap-3">
        <div className="cursor-move text-gray-400">
          <MoveUp className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id={`field-${field.id}`} checked={field.enabled} onCheckedChange={() => toggleField(field.id)} />
          <Label htmlFor={`field-${field.id}`} className="cursor-pointer">
            {field.label}
          </Label>
        </div>
      </div>
    </div>
  )
}

export default function ReportGeneratorPage() {
  const searchParams = useSearchParams()
  const listId = searchParams.get("listId")

  const [volunteers, setVolunteers] = useState<CardType[]>([])
  const [lists, setLists] = useState<{ id: string; title: string }[]>([])
  const [fields, setFields] = useState<{ id: string; label: string; enabled: boolean }[]>([])
  const [excludedVolunteers, setExcludedVolunteers] = useState<string[]>([])
  const [reportTitle, setReportTitle] = useState("Volunteer Report")
  const [includeHeader, setIncludeHeader] = useState(true)
  const [reportFormat, setReportFormat] = useState<"csv" | "html">("csv")
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("fields")

  // Load data from localStorage
  useEffect(() => {
    try {
      setIsLoading(true)

      // Get filter parameters from URL
      const filtered = searchParams.get("filtered") === "true"
      const filterRoles = searchParams.get("roles")?.split(",") || []
      const filterTags = searchParams.get("tags")?.split(",") || []
      const filterLists = searchParams.get("lists")?.split(",") || []

      // Load volunteers
      const savedVolunteers = localStorage.getItem("testVolunteers")
      if (savedVolunteers) {
        const parsedVolunteers = JSON.parse(savedVolunteers)
        let filteredVolunteers = parsedVolunteers

        // Apply filters if they exist and filtered flag is true
        if (filtered) {
          filteredVolunteers = parsedVolunteers.filter((volunteer: CardType) => {
            // Filter by roles if any are selected
            const matchesRoles =
              filterRoles.length === 0 ||
              (volunteer.currentRoles && volunteer.currentRoles.some((role) => filterRoles.includes(role)))

            // Filter by tags if any are selected
            const matchesTags =
              filterTags.length === 0 || (volunteer.tags && volunteer.tags.some((tag) => filterTags.includes(tag)))

            // Filter by lists if any are selected
            const matchesLists = filterLists.length === 0 || filterLists.includes(volunteer.listId || "")

            return matchesRoles && matchesTags && matchesLists
          })
        }

        // If listId is provided and not all-volunteers-list, filter by list
        if (listId && listId !== "all-volunteers-list") {
          setVolunteers(filteredVolunteers.filter((v: CardType) => v.listId === listId))
        } else {
          setVolunteers(filteredVolunteers)
        }

        // Set excluded volunteers to be those NOT in the filtered list
        if (filtered) {
          const filteredIds = new Set(filteredVolunteers.map((v: CardType) => v.id))
          const excludedIds = parsedVolunteers
            .filter((v: CardType) => !filteredIds.has(v.id))
            .map((v: CardType) => v.id)
          setExcludedVolunteers(excludedIds)
        }
      }

      // Load lists
      const savedLists = localStorage.getItem("volunteerTrackerLists")
      if (savedLists) {
        setLists(JSON.parse(savedLists))
      }

      // Initialize fields
      setFields(
        AVAILABLE_FIELDS.map((field) => ({
          id: field.id,
          label: field.label,
          enabled: field.default,
        })),
      )

      setIsLoading(false)
    } catch (error) {
      console.error("Error loading data:", error)
      setIsLoading(false)
    }
  }, [listId, searchParams])

  // Move field in the ordered list
  const moveField = (dragIndex: number, hoverIndex: number) => {
    setFields((prevFields) => {
      const newFields = [...prevFields]
      const draggedField = newFields[dragIndex]
      newFields.splice(dragIndex, 1)
      newFields.splice(hoverIndex, 0, draggedField)
      return newFields
    })
  }

  // Toggle field inclusion
  const toggleField = (id: string) => {
    setFields((prevFields) =>
      prevFields.map((field) => (field.id === id ? { ...field, enabled: !field.enabled } : field)),
    )
  }

  // Toggle volunteer exclusion
  const toggleVolunteerExclusion = (id: string) => {
    setExcludedVolunteers((prev) => (prev.includes(id) ? prev.filter((vId) => vId !== id) : [...prev, id]))
  }

  // Get list name by ID
  const getListName = (listId: string | undefined) => {
    if (!listId) return "Unassigned"
    const list = lists.find((l) => l.id === listId)
    return list ? list.title : "Unknown List"
  }

  // Generate report
  const generateReport = () => {
    // Get all volunteers from localStorage
    const allVolunteers = JSON.parse(localStorage.getItem("testVolunteers") || "[]")

    // Filter out excluded volunteers
    const includedVolunteers = allVolunteers.filter((v: CardType) => !excludedVolunteers.includes(v.id))

    // Get enabled fields in the correct order
    const enabledFields = fields.filter((f) => f.enabled)

    if (enabledFields.length === 0) {
      alert("Please select at least one field to include in the report")
      return
    }

    if (includedVolunteers.length === 0) {
      alert("No volunteers to include in the report")
      return
    }

    if (reportFormat === "csv") {
      generateCSV(includedVolunteers, enabledFields)
    } else {
      generateHTML(includedVolunteers, enabledFields)
    }
  }

  // Generate CSV report
  const generateCSV = (volunteers: CardType[], fields: { id: string; label: string }[]) => {
    // Create header row
    const headers = fields.map((f) => f.label)

    // Create data rows
    const rows = volunteers.map((volunteer) => {
      return fields.map((field) => {
        switch (field.id) {
          case "name":
            return volunteer.title
          case "email":
            return volunteer.email || ""
          case "phone":
            return volunteer.phone || ""
          case "list":
            return getListName(volunteer.listId)
          case "roles":
            return (volunteer.currentRoles || []).join("; ")
          case "tags":
            return (volunteer.tags || []).join("; ")
          case "notes":
            return volunteer.description?.replace(/\n/g, " ") || ""
          case "createdAt":
            return volunteer.createdAt ? new Date(volunteer.createdAt).toLocaleDateString() : ""
          case "checklistProgress":
            if (!volunteer.checklistProgress) return "0%"
            const completed = volunteer.checklistProgress.filter((p) => p.completed).length
            const total = volunteer.checklistProgress.length
            return total > 0 ? `${Math.round((completed / total) * 100)}%` : "N/A"
          case "attachments":
            return volunteer.attachments && volunteer.attachments.length > 0 ? "Yes" : "No"
          default:
            return ""
        }
      })
    })

    // Combine header and rows
    const csvContent = [
      includeHeader ? headers.join(",") : null,
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ]
      .filter(Boolean)
      .join("\n")

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${reportTitle.replace(/\s+/g, "-")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Generate HTML report
  const generateHTML = (volunteers: CardType[], fields: { id: string; label: string }[]) => {
    // Create HTML content
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${reportTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h1>${reportTitle}</h1>
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        <p>Total volunteers: ${volunteers.length}</p>
        <table>
    `

    // Add header row
    if (includeHeader) {
      htmlContent += "<thead><tr>"
      fields.forEach((field) => {
        htmlContent += `<th>${field.label}</th>`
      })
      htmlContent += "</tr></thead>"
    }

    // Add data rows
    htmlContent += "<tbody>"
    volunteers.forEach((volunteer) => {
      htmlContent += "<tr>"
      fields.forEach((field) => {
        let cellContent = ""
        switch (field.id) {
          case "name":
            cellContent = volunteer.title
            break
          case "email":
            cellContent = volunteer.email || ""
            break
          case "phone":
            cellContent = volunteer.phone || ""
            break
          case "list":
            cellContent = getListName(volunteer.listId)
            break
          case "roles":
            cellContent = (volunteer.currentRoles || []).join("; ")
            break
          case "tags":
            cellContent = (volunteer.tags || []).join("; ")
            break
          case "notes":
            cellContent = volunteer.description || ""
            break
          case "createdAt":
            cellContent = volunteer.createdAt ? new Date(volunteer.createdAt).toLocaleDateString() : ""
            break
          case "checklistProgress":
            if (!volunteer.checklistProgress) cellContent = "0%"
            else {
              const completed = volunteer.checklistProgress.filter((p) => p.completed).length
              const total = volunteer.checklistProgress.length
              cellContent = total > 0 ? `${Math.round((completed / total) * 100)}%` : "N/A"
            }
            break
          case "attachments":
            cellContent = volunteer.attachments && volunteer.attachments.length > 0 ? "Yes" : "No"
            break
        }
        htmlContent += `<td>${cellContent}</td>`
      })
      htmlContent += "</tr>"
    })
    htmlContent += "</tbody></table></body></html>"

    // Create download link
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${reportTitle.replace(/\s+/g, "-")}.html`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    const nameParts = name.split(" ")
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    }
    return nameParts[0].substring(0, 2).toUpperCase()
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <main className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <Link href="/">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Board
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Report Generator</h1>
            <p className="text-gray-600 mt-2">Customize and generate reports from your volunteer data</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Report Settings</CardTitle>
                  <CardDescription>Configure your report options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="report-title">Report Title</Label>
                    <Input
                      id="report-title"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      placeholder="Enter report title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="report-format">Report Format</Label>
                    <Select value={reportFormat} onValueChange={(value) => setReportFormat(value as "csv" | "html")}>
                      <SelectTrigger id="report-format">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV (Excel)</SelectItem>
                        <SelectItem value="html">HTML (Web Page)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="include-header" checked={includeHeader} onCheckedChange={setIncludeHeader} />
                    <Label htmlFor="include-header">Include column headers</Label>
                  </div>

                  <div className="pt-4">
                    <Button onClick={generateReport} className="w-full flex items-center justify-center gap-2">
                      <Download className="h-4 w-4" />
                      Generate Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Report Customization</CardTitle>
                  <CardDescription>Select which fields to include and their order</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="fields">Fields</TabsTrigger>
                      <TabsTrigger value="volunteers">
                        {(() => {
                          // Get total count of all volunteers
                          const allVolunteers = JSON.parse(localStorage.getItem("testVolunteers") || "[]")
                          const includedCount = allVolunteers.length - excludedVolunteers.length
                          return `Volunteers (${includedCount}/${allVolunteers.length})`
                        })()}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="fields" className="pt-4">
                      <div className="space-y-2 mb-4">
                        <p className="text-sm text-gray-500">
                          Drag to reorder fields. Check/uncheck to include/exclude fields.
                        </p>
                      </div>

                      <div className="space-y-1">
                        {fields.map((field, index) => (
                          <FieldItem
                            key={field.id}
                            field={field}
                            index={index}
                            moveField={moveField}
                            toggleField={toggleField}
                          />
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="volunteers" className="pt-4">
                      <div className="space-y-2 mb-4">
                        <p className="text-sm text-gray-500">
                          {searchParams.get("filtered") === "true"
                            ? "Volunteers are pre-filtered based on your board filters. You can modify the selection below."
                            : "Select which volunteers to include in the report."}
                        </p>
                      </div>

                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Include</TableHead>
                              <TableHead>Volunteer</TableHead>
                              <TableHead>List</TableHead>
                              <TableHead>Roles</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {volunteers.map((volunteer) => (
                              <TableRow key={volunteer.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={!excludedVolunteers.includes(volunteer.id)}
                                    onCheckedChange={() => toggleVolunteerExclusion(volunteer.id)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={volunteer.image || ""} alt={volunteer.title} />
                                      <AvatarFallback>{getInitials(volunteer.title)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium">{volunteer.title}</p>
                                      <p className="text-xs text-gray-500">{volunteer.email}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{getListName(volunteer.listId)}</TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {(volunteer.currentRoles || []).map((role, i) => (
                                      <Badge key={i} variant="outline" className="text-xs py-0 px-1.5 h-5">
                                        {role}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Add a section to show excluded volunteers that can be added */}
                      {searchParams.get("filtered") === "true" && excludedVolunteers.length > 0 && (
                        <div className="mt-6">
                          <h3 className="text-sm font-medium mb-2">Additional Volunteers</h3>
                          <p className="text-xs text-gray-500 mb-4">
                            These volunteers are not included in your filtered view. Check any you want to add to the
                            report.
                          </p>

                          <div className="border rounded-md overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-12">Add</TableHead>
                                  <TableHead>Volunteer</TableHead>
                                  <TableHead>List</TableHead>
                                  <TableHead>Roles</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(() => {
                                  // Get all volunteers from localStorage
                                  const allVolunteers = JSON.parse(localStorage.getItem("testVolunteers") || "[]")
                                  // Filter to only show excluded volunteers
                                  return allVolunteers
                                    .filter((v: CardType) => excludedVolunteers.includes(v.id))
                                    .map((volunteer: CardType) => (
                                      <TableRow key={volunteer.id}>
                                        <TableCell>
                                          <Checkbox
                                            checked={!excludedVolunteers.includes(volunteer.id)}
                                            onCheckedChange={() => toggleVolunteerExclusion(volunteer.id)}
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                              <AvatarImage src={volunteer.image || ""} alt={volunteer.title} />
                                              <AvatarFallback>{getInitials(volunteer.title)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                              <p className="font-medium">{volunteer.title}</p>
                                              <p className="text-xs text-gray-500">{volunteer.email}</p>
                                            </div>
                                          </div>
                                        </TableCell>
                                        <TableCell>{getListName(volunteer.listId)}</TableCell>
                                        <TableCell>
                                          <div className="flex flex-wrap gap-1">
                                            {(volunteer.currentRoles || []).map((role, i) => (
                                              <Badge key={i} variant="outline" className="text-xs py-0 px-1.5 h-5">
                                                {role}
                                              </Badge>
                                            ))}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))
                                })()}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => window.history.back()}>
                    Cancel
                  </Button>
                  <Button onClick={generateReport} className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Generate Report
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </DndProvider>
  )
}
