import { type NextRequest, NextResponse } from "next/server"

// Get environment variables
const LGL_API_TOKEN = process.env.LGL_API_TOKEN || ""
const LGL_API_URL = process.env.LGL_API_URL || "https://api.littlegreenlight.com/api/v1"

export async function GET(request: NextRequest) {
  // Check if API token is configured
  if (!LGL_API_TOKEN) {
    return NextResponse.json({ error: "LGL API token is not configured" }, { status: 500 })
  }

  try {
    // Get the endpoint from the query parameter
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get("endpoint") || "/constituents"

    // Make the API request
    const url = `${LGL_API_URL}${endpoint}`
    console.log(`Making API request to: ${url}`)

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${LGL_API_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`LGL API error (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in LGL API proxy:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Check if API token is configured
  if (!LGL_API_TOKEN) {
    return NextResponse.json({ error: "LGL API token is not configured" }, { status: 500 })
  }

  try {
    // Get the endpoint and body from the request
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get("endpoint") || "/constituents"
    const body = await request.json()

    // Make the API request
    const url = `${LGL_API_URL}${endpoint}`
    console.log(`Making API request to: ${url}`)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LGL_API_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`LGL API error (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in LGL API proxy:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
