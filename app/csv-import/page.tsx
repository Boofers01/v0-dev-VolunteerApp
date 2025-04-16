"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Upload, FileUp, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useRouter } from "next/navigation"
import { parseCSV } from "@/lib/csv-service"
import type { CardType } from "@/lib/types"
import { Progress } from "@/components/ui/progress"

// Local storage keys
const LISTS_STORAGE_KEY = "volunteerTrackerLists"
const VOLUNTEERS_STORAGE_KEY = "testVolunteers"

export default function CSVImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{
    success?: boolean
    message?: string
    error?: string
    added: number
    skipped: number
    total: number
    duplicateNames?: string[]
  } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setIsProcessing(true)
    setProgress(0)
    setResult(null)

    try {
      // Read the file
      const fileContent = await readFileAsText(file)

      // Parse the CSV
      const volunteers = await parseCSV(fileContent, (percent) => {
        setProgress(percent)
      })

      // Get existing volunteers from localStorage
      const existingVolunteers = JSON.parse(localStorage.getItem(VOLUNTEERS_STORAGE_KEY) || "[]") as CardType[]

      // Get lists from localStorage to preserve list assignments
      const storedLists = JSON.parse(localStorage.getItem(LISTS_STORAGE_KEY) || "[]")

      // Create maps for quick lookup
      const existingIds = new Map<string, CardType>()
      const existingEmails = new Map<string, CardType>()

      // Build maps of existing volunteers with their list IDs
      existingVolunteers.forEach((v) => {
        existingIds.set(v.id, v)
        if (v.email) {
          existingEmails.set(v.email.toLowerCase(), v)
        }
      })

      // Filter out duplicates but preserve list positions
      const newVolunteers: CardType[] = []
      const updatedExistingVolunteers: CardType[] = [...existingVolunteers]
      const duplicateNames: string[] = []

      volunteers.forEach((volunteer) => {
        // Check if ID already exists
        if (existingIds.has(volunteer.id)) {
          // This is a duplicate - add to the list of duplicate names
          duplicateNames.push(volunteer.title)
          return
        }

        // Check if email already exists
        if (volunteer.email && existingEmails.has(volunteer.email.toLowerCase())) {
          // This is a duplicate - add to the list of duplicate names
          duplicateNames.push(volunteer.title)
          return
        }

        // It's a new volunteer - assign to first list
        if (storedLists && storedLists.length > 0) {
          volunteer.listId = storedLists[0].id
        }
        newVolunteers.push(volunteer)
      })

      // Add new volunteers to the list
      const allVolunteers = [...updatedExistingVolunteers, ...newVolunteers]
      localStorage.setItem(VOLUNTEERS_STORAGE_KEY, JSON.stringify(allVolunteers))

      // Set result
      setResult({
        success: true,
        message:
          newVolunteers.length > 0
            ? `CSV import completed successfully.`
            : `All volunteers in this CSV already exist in your board.`,
        added: newVolunteers.length,
        skipped: volunteers.length - newVolunteers.length,
        total: volunteers.length,
        duplicateNames: duplicateNames.length > 0 ? duplicateNames : undefined,
      })
    } catch (error) {
      console.error("Error importing CSV:", error)
      setResult({
        success: false,
        error: (error as Error).message || "Failed to import CSV",
        added: 0,
        skipped: 0,
        total: 0,
      })
    } finally {
      setIsProcessing(false)
      setProgress(100)
    }
  }

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string)
        } else {
          reject(new Error("Failed to read file"))
        }
      }
      reader.onerror = () => reject(new Error("File read error"))
      reader.readAsText(file)
    })
  }

  const goToBoard = () => {
    router.push("/")
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Board
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">CSV Import</h1>
          <p className="text-gray-600 mt-2">Import volunteers from a CSV file exported from Little Green Light.</p>
        </div>

        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Import Volunteers from CSV</CardTitle>
            <CardDescription>
              Upload a CSV file exported from Little Green Light to add volunteers to your board.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input type="file" id="csv-file" accept=".csv" onChange={handleFileChange} className="hidden" />
                <label htmlFor="csv-file" className="flex flex-col items-center justify-center cursor-pointer">
                  <FileUp className="h-12 w-12 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-700">
                    {file ? file.name : "Click to select a CSV file"}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    {file ? `${(file.size / 1024).toFixed(2)} KB` : "CSV files only"}
                  </span>
                </label>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing...</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {result && (
                <Alert variant={result.success ? "default" : "destructive"}>
                  {result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
                  <AlertDescription>
                    {result.success ? (
                      <>
                        <p>{result.message}</p>
                        <div className="mt-2 text-sm">
                          <p>Total records: {result.total}</p>
                          <p>Added: {result.added}</p>
                          <p>Skipped (duplicates): {result.skipped}</p>

                          {result.duplicateNames && result.duplicateNames.length > 0 && (
                            <div className="mt-2">
                              <p className="font-medium">Duplicate volunteers:</p>
                              <div className="max-h-32 overflow-y-auto mt-1 bg-gray-50 p-2 rounded text-xs">
                                {result.duplicateNames.map((name, index) => (
                                  <div key={index} className="mb-1">
                                    {name}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mt-4">
                          <Button onClick={goToBoard} variant="outline" size="sm" className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Go to Board
                          </Button>
                        </div>
                      </>
                    ) : (
                      result.error
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleImport} disabled={!file || isProcessing} className="flex items-center gap-2 w-full">
              <Upload className="h-4 w-4" />
              {isProcessing ? "Processing..." : "Import Volunteers"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
