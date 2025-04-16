"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Copy, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react"

export function WebhookSetupGuide() {
  const [copied, setCopied] = useState(false)
  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/lgl-webhook` : ""

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>LGL Webhook Integration Setup</CardTitle>
        <CardDescription>Follow these steps to connect your LGL volunteer form to this application</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="setup">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup">Setup Instructions</TabsTrigger>
            <TabsTrigger value="fields">Field Mapping</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4 mt-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                You'll need administrator access to your LGL account to set up this integration.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Step 1: Copy your webhook URL</h3>
              <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-md">
                <code className="text-sm flex-1 overflow-x-auto">{webhookUrl}</code>
                <Button size="sm" variant="outline" onClick={copyToClipboard}>
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <h3 className="text-lg font-medium">Step 2: Create a webhook endpoint in LGL</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Log in to your LGL account</li>
                <li>
                  Go to <strong>Settings</strong> &gt; <strong>Integration Settings</strong>
                </li>
                <li>
                  Click on <strong>Webhook endpoints</strong> under Custom Integrations
                </li>
                <li>
                  Click <strong>+ Add new integration</strong>
                </li>
                <li>Name your integration (e.g., "Volunteer Tracker")</li>
                <li>Paste the webhook URL from Step 1</li>
                <li>Save the integration</li>
              </ol>

              <h3 className="text-lg font-medium">Step 3: Connect your volunteer form</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Go to <strong>Forms</strong> &gt; Find your volunteer form
                </li>
                <li>
                  Click on <strong>LGL Integration</strong>
                </li>
                <li>Select your new webhook integration</li>
                <li>Save the changes</li>
              </ol>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() =>
                  window.open("https://help.littlegreenlight.com/article/532-custom-integrations", "_blank")
                }
              >
                LGL Documentation <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="fields" className="space-y-4 mt-4">
            <h3 className="text-lg font-medium">Field Mapping</h3>
            <p className="text-sm text-gray-600 mb-4">
              When setting up your webhook integration in LGL, make sure to map these fields:
            </p>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Form Field</th>
                    <th className="px-4 py-2 text-left">Webhook Field Name</th>
                    <th className="px-4 py-2 text-left">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="px-4 py-2">First Name</td>
                    <td className="px-4 py-2 font-mono text-sm">first_name</td>
                    <td className="px-4 py-2 text-sm text-gray-600">Volunteer's first name</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Last Name</td>
                    <td className="px-4 py-2 font-mono text-sm">last_name</td>
                    <td className="px-4 py-2 text-sm text-gray-600">Volunteer's last name</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Email</td>
                    <td className="px-4 py-2 font-mono text-sm">email</td>
                    <td className="px-4 py-2 text-sm text-gray-600">Volunteer's email address</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Phone</td>
                    <td className="px-4 py-2 font-mono text-sm">phone_number</td>
                    <td className="px-4 py-2 text-sm text-gray-600">Volunteer's phone number</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Comments/Notes</td>
                    <td className="px-4 py-2 font-mono text-sm">notes</td>
                    <td className="px-4 py-2 text-sm text-gray-600">Additional information</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Volunteer Interests</td>
                    <td className="px-4 py-2 font-mono text-sm">volunteer_role</td>
                    <td className="px-4 py-2 text-sm text-gray-600">Volunteer's interests or roles</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Field Names</AlertTitle>
              <AlertDescription>
                The field names in the "Webhook Field Name" column must match exactly what you configure in LGL.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="testing" className="space-y-4 mt-4">
            <h3 className="text-lg font-medium">Testing Your Integration</h3>

            <ol className="list-decimal pl-5 space-y-2">
              <li>Submit a test entry through your volunteer form</li>
              <li>Check the Integration Queue in LGL (Settings &gt; Integration Queue)</li>
              <li>Verify the data was received correctly</li>
              <li>Return to this application and click "Sync with LGL" to see if your volunteer appears</li>
            </ol>

            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Troubleshooting</AlertTitle>
              <AlertDescription>
                If your form submissions aren't appearing in the tracker:
                <ul className="list-disc pl-5 mt-2">
                  <li>Check the Integration Queue in LGL for any errors</li>
                  <li>Verify your webhook URL is correct</li>
                  <li>Make sure your form is connected to the webhook integration</li>
                  <li>Check that field names match what the application expects</li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
