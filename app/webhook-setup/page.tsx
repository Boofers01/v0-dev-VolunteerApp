import { WebhookSetupGuide } from "@/components/webhook-setup-guide"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function WebhookSetupPage() {
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
          <h1 className="text-3xl font-bold text-gray-800">Webhook Setup</h1>
          <p className="text-gray-600 mt-2">
            Configure your LGL webhook integration to automatically add new volunteers to the tracker.
          </p>
        </div>

        <WebhookSetupGuide />
      </div>
    </main>
  )
}
