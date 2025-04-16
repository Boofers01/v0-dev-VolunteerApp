import { type NextRequest, NextResponse } from "next/server"
import { processFormSubmission } from "@/lib/lgl-service"
import { getChecklistItems } from "@/lib/checklist-service"
import type { CardType } from "@/lib/types"

// Store the last processed volunteer for debugging
let lastProcessedVolunteer: CardType | null = null

// This is a webhook endpoint that receives notifications from LGL
// when a new form submission is received
export async function POST(request: NextRequest) {
  console.log("🔔 Webhook endpoint called")

  try {
    // Parse the incoming webhook payload
    let payload
    try {
      payload = await request.json()
      console.log("📦 Webhook payload received:", JSON.stringify(payload, null, 2))
    } catch (error) {
      console.error("❌ Error parsing webhook payload:", error)
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    // Process the form submission
    console.log("🔄 Processing form submission...")
    const volunteerData = await processFormSubmission(payload)
    console.log("✅ Volunteer data processed:", JSON.stringify(volunteerData, null, 2))

    // Get the default checklist items
    console.log("📋 Getting checklist items...")
    const checklistItems = await getChecklistItems()

    // Create checklist progress for the new volunteer
    const checklistProgress = checklistItems.map((item) => ({
      itemId: item.id,
      completed: false,
    }))

    // Create a new volunteer card
    const newVolunteerCard: CardType = {
      id: volunteerData.id,
      title: `${volunteerData.firstName} ${volunteerData.lastName}`,
      description: volunteerData.notes || "",
      email: volunteerData.email,
      phone: volunteerData.phone,
      image: null,
      tags: volunteerData.tags || [],
      createdAt: new Date().toISOString(),
      checklistProgress,
      data: volunteerData,
    }

    // Store the last processed volunteer for debugging
    lastProcessedVolunteer = newVolunteerCard
    console.log("🎉 New volunteer card created:", JSON.stringify(newVolunteerCard, null, 2))

    // Return success with the created card
    return NextResponse.json({
      success: true,
      message: "Form submission processed successfully",
      volunteer: newVolunteerCard,
    })
  } catch (error) {
    console.error("❌ Error processing webhook:", error)
    return NextResponse.json(
      {
        error: "Failed to process webhook",
        message: (error as Error).message,
      },
      { status: 500 },
    )
  }
}

// Add a GET endpoint to retrieve the last processed volunteer (for debugging)
export async function GET() {
  return NextResponse.json({
    lastProcessedVolunteer,
    timestamp: new Date().toISOString(),
  })
}
