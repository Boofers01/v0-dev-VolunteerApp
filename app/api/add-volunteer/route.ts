import { type NextRequest, NextResponse } from "next/server"
import type { CardType } from "@/lib/types"

// In-memory storage for test volunteers (since file-based storage won't work in serverless)
const testVolunteers: CardType[] = []

export async function POST(request: NextRequest) {
  try {
    const volunteer = await request.json()

    if (!volunteer || !volunteer.id || !volunteer.title) {
      return NextResponse.json({ error: "Invalid volunteer data" }, { status: 400 })
    }

    // Check if volunteer already exists
    const existingIndex = testVolunteers.findIndex((v) => v.id === volunteer.id)

    if (existingIndex >= 0) {
      // Update existing volunteer
      testVolunteers[existingIndex] = volunteer
    } else {
      // Add new volunteer
      testVolunteers.push(volunteer)
    }

    console.log(`Stored test volunteer: ${volunteer.title} (ID: ${volunteer.id})`)

    return NextResponse.json({
      success: true,
      message: "Volunteer added successfully",
    })
  } catch (error) {
    console.error("Error adding volunteer:", error)
    return NextResponse.json(
      {
        error: "Failed to add volunteer",
        message: (error as Error).message,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({ volunteers: testVolunteers })
}
