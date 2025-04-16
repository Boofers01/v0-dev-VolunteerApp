import { NextResponse } from "next/server"

export async function GET() {
  // Only expose that the variables exist, not their actual values for security
  const environment = {
    LGL_API_TOKEN: process.env.LGL_API_TOKEN ? "set" : undefined,
    LGL_API_URL: process.env.LGL_API_URL || "not set",
    LGL_WEBHOOK_SECRET: process.env.LGL_WEBHOOK_SECRET ? "set" : undefined,
    NODE_ENV: process.env.NODE_ENV,
  }

  return NextResponse.json({
    environment,
    timestamp: new Date().toISOString(),
  })
}
