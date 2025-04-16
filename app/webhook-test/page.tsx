"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Send, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useRouter } from "next/navigation"
import type { CardType } from "@/lib/types"

export default function WebhookTestPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    first_name: "Test",
    last_name: "Volunteer",
    email: "test@example.com",
    phone_number: "(555) 123-4567",
    notes: "This is a test submission from the webhook tester.",
    volunteer_role: "Test Volunteer",
    record_id: `test-${Date.now()}`,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{
    success?: boolean
    message?: string
    error?: string
    volunteer?: CardType | null
  } | null>(null)
  const [directAddMode, setDirectAddMode] = useState(true) // Default to true

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setResult(null)

    try {
      const webhookUrl = "/api/lgl-webhook"
      console.log("Sending test data to webhook:", formData)

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      console.log("Webhook response:", data)

      if (response.ok) {
        setResult({
          success: true,
          message: "Webhook test successful! The volunteer was processed correctly.",
          volunteer: data.volunteer,
        })

        // If in direct add mode, add the volunteer to localStorage
        if (directAddMode && data.volunteer) {
          try {
            // Store the volunteer in localStorage for immediate access
            const existingVolunteers = JSON.parse(localStorage.getItem("testVolunteers") || "[]")
            existingVolunteers.push(data.volunteer)
            localStorage.setItem("testVolunteers", JSON.stringify(existingVolunteers))

            setResult((prev) => ({
              ...prev,
              message: "Volunteer was successfully added to the board! Refresh the board to see it.",
            }))
          } catch (error) {
            console.error("Error adding volunteer to localStorage:", error)
          }
        }
      } else {
        setResult({
          success: false,
          error: data.error || data.message || "Unknown error occurred",
        })
      }
    } catch (error) {
      console.error("Error testing webhook:", error)
      setResult({
        success: false,
        error: (error as Error).message || "Failed to send test webhook",
      })
    } finally {
      setIsSubmitting(false)
    }
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
          <h1 className="text-3xl font-bold text-gray-800">Webhook Test Tool</h1>
          <p className="text-gray-600 mt-2">Use this tool to test if your webhook endpoint is working correctly.</p>
        </div>

        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Send Test Volunteer Data</CardTitle>
            <CardDescription>
              This will simulate a form submission from LGL to test your webhook integration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Direct Add Mode</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>When enabled, this will directly add the test volunteer to your board.</span>
                <Button
                  variant={directAddMode ? "default" : "outline"}
                  onClick={() => setDirectAddMode(!directAddMode)}
                >
                  {directAddMode ? "Enabled" : "Disabled"}
                </Button>
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" name="last_name" value={formData.last_name} onChange={handleChange} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input id="phone_number" name="phone_number" value={formData.phone_number} onChange={handleChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="volunteer_role">Volunteer Role</Label>
                <Input
                  id="volunteer_role"
                  name="volunteer_role"
                  value={formData.volunteer_role}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={3} />
              </div>

              {result && (
                <Alert variant={result.success ? "default" : "destructive"}>
                  {result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
                  <AlertDescription>
                    {result.success ? (
                      <>
                        {result.message}
                        <div className="mt-2">
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

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
                  {isSubmitting ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Test Data
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
