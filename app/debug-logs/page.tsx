"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, Trash2, Copy } from "lucide-react"
import Link from "next/link"
import { getDebugLogs, clearDebugLogs } from "@/lib/debug-utils"

export default function DebugLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [storedVolunteers, setStoredVolunteers] = useState<string>("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Load logs
    setLogs(getDebugLogs())

    // Load volunteers from localStorage
    try {
      const volunteers = localStorage.getItem("testVolunteers")
      if (volunteers) {
        // Format the JSON for better readability
        const formattedJson = JSON.stringify(JSON.parse(volunteers), null, 2)
        setStoredVolunteers(formattedJson)
      } else {
        setStoredVolunteers("No volunteers found")
      }
    } catch (error) {
      console.error("Error loading volunteers:", error)
      setStoredVolunteers("Error loading volunteers")
    }

    // Set up interval to refresh logs
    const interval = setInterval(() => {
      setLogs(getDebugLogs())
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const handleClearLogs = () => {
    clearDebugLogs()
    setLogs([])
  }

  const handleCopyVolunteers = () => {
    navigator.clipboard.writeText(storedVolunteers)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

        <h1 className="text-3xl font-bold text-gray-800 mb-8">Debug Logs</h1>
        <p className="text-gray-600 mb-8">View debug logs to help diagnose issues with the application.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Debug Logs</CardTitle>
                <CardDescription>Recent application logs</CardDescription>
              </div>
              <Button variant="destructive" size="sm" onClick={handleClearLogs}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Logs
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] w-full">
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No logs available</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-2 pb-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500">[{log.timestamp}]</span>
                        <span className="font-medium">{log.message}</span>
                      </div>
                      {log.data && (
                        <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">{log.data}</pre>
                      )}
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Stored Volunteers</CardTitle>
                <CardDescription>Volunteers currently stored in localStorage</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyVolunteers} className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                {copied ? "Copied!" : "Copy All"}
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] w-full">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap p-4 bg-gray-50 rounded-md">
                  {storedVolunteers}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
