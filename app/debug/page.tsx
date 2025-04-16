"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw, Plus } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useRouter } from "next/navigation"
import type { CardType } from "@/lib/types"

export default function DebugPage() {
  const router = useRouter()
  const [envVars, setEnvVars] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingTestVolunteer, setIsAddingTestVolunteer] = useState(false)

  useEffect(() => {
    checkEnvironment()
  }, [])

  const checkEnvironment = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/debug")
      const data = await response.json()
      setEnvVars(data.environment || {})
    } catch (error) {
      console.error("Failed to check environment:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const addTestVolunteerDirectly = () => {
    setIsAddingTestVolunteer(true)
    try {
      // Create a test volunteer
      const testVolunteer: CardType = {
        id: `direct-test-${Date.now()}`,
        title: `Direct Test Volunteer`,
        description: "This volunteer was added directly from the debug page.",
        email: "direct-test@example.com",
        phone: "(555) 123-4567",
        tags: ["Test", "Debug"],
        createdAt: new Date().toISOString(),
        checklistProgress: [],
        data: {
          id: `direct-test-${Date.now()}`,
          firstName: "Direct",
          lastName: "Test Volunteer",
          email: "direct-test@example.com",
          phone: "(555) 123-4567",
          notes: "This volunteer was added directly from the debug page.",
          tags: ["Test", "Debug"],
        },
      }

      // Store in localStorage
      const existingVolunteers = JSON.parse(localStorage.getItem("testVolunteers") || "[]")
      existingVolunteers.push(testVolunteer)
      localStorage.setItem("testVolunteers", JSON.stringify(existingVolunteers))

      alert("Test volunteer added successfully! Go back to the board to see it.")
      setIsAddingTestVolunteer(false)
    } catch (error) {
      console.error("Error adding test volunteer:", error)
      alert("Failed to add test volunteer: " + (error as Error).message)
      setIsAddingTestVolunteer(false)
    }
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
          <h1 className="text-3xl font-bold text-gray-800">Debug Information</h1>
          <p className="text-gray-600 mt-2">This page shows diagnostic information to help troubleshoot issues.</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>These are the environment variables available to the application.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                <span>Loading environment variables...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert variant={envVars.LGL_API_TOKEN ? "default" : "destructive"}>
                  <AlertTitle>LGL_API_TOKEN</AlertTitle>
                  <AlertDescription>
                    {envVars.LGL_API_TOKEN
                      ? "✅ Set (value hidden for security)"
                      : "❌ Not set - This is required to connect to LGL"}
                  </AlertDescription>
                </Alert>

                <Alert variant={envVars.LGL_API_URL ? "default" : "warning"}>
                  <AlertTitle>LGL_API_URL</AlertTitle>
                  <AlertDescription>
                    {envVars.LGL_API_URL
                      ? `✅ Set to: ${envVars.LGL_API_URL}`
                      : "⚠️ Not set - Using default: https://api.littlegreenlight.com/api/v1"}
                  </AlertDescription>
                </Alert>

                <Alert variant={envVars.LGL_WEBHOOK_SECRET ? "default" : "warning"}>
                  <AlertTitle>LGL_WEBHOOK_SECRET</AlertTitle>
                  <AlertDescription>
                    {envVars.LGL_WEBHOOK_SECRET
                      ? "✅ Set (value hidden for security)"
                      : "⚠️ Not set - Webhook verification is disabled"}
                  </AlertDescription>
                </Alert>

                <div className="mt-4">
                  <Button onClick={checkEnvironment} className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Webhook</CardTitle>
              <CardDescription>Test the webhook endpoint directly.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>Use the Test Webhook tool to send test data directly to your webhook endpoint.</p>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/webhook-test">
                <Button>Go to Test Webhook</Button>
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Direct Add</CardTitle>
              <CardDescription>Add a test volunteer directly to the board.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  Click the button below to add a test volunteer directly to the board without going through the
                  webhook.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={addTestVolunteerDirectly}
                disabled={isAddingTestVolunteer}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {isAddingTestVolunteer ? "Adding..." : "Add Test Volunteer"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  )
}
