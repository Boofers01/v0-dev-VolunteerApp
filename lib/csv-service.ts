"use client"

import type { CardType } from "@/lib/types"

// Parse CSV data and convert to volunteer cards
export async function parseCSV(csvData: string, progressCallback?: (percent: number) => void): Promise<CardType[]> {
  try {
    // Parse CSV
    const lines = csvData.split("\n")
    const headers = parseCSVLine(lines[0])

    // Get column indexes for the fields we need
    const submissionIdIndex = headers.findIndex((h) => h === "Submission ID")
    const submissionDateIndex = headers.findIndex((h) => h === "Submission Date")
    const firstNameIndex = headers.findIndex((h) => h === "Name - First Name")
    const lastNameIndex = headers.findIndex((h) => h === "Name - Last Name")
    const emailIndex = headers.findIndex((h) => h === "Preferred Email Address")
    const phoneIndex = headers.findIndex((h) => h === "Preferred Phone Number")
    const dobIndex = headers.findIndex((h) => h === "Date of Birth of Volunteer")
    const whyVolunteerIndex = headers.findIndex((h) => h === "Why would you like to volunteer with FNC?")
    const interestsIndex = headers.findIndex((h) => h === "What kind of volunteer activities are you interested in?")
    const locationsIndex = headers.findIndex(
      (h) =>
        h ===
        "Select all places you are able to voluneer at. Please note that not all opportunities are available at all locations.",
    )

    // Get all CSV data for notes
    const allFields: Record<string, number> = {}
    headers.forEach((header, index) => {
      allFields[header] = index
    })

    // Process each line
    const volunteers: CardType[] = []

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      // Update progress
      if (progressCallback) {
        progressCallback((i / lines.length) * 100)
      }

      const line = lines[i].trim()
      if (!line) continue

      const values = parseCSVLine(line)

      // Skip if missing essential data
      if (!values[submissionIdIndex] || !values[firstNameIndex] || !values[lastNameIndex]) {
        continue
      }

      // Extract volunteer data
      const id = values[submissionIdIndex]
      const firstName = values[firstNameIndex]?.trim() || ""
      const lastName = values[lastNameIndex]?.trim() || ""
      const email = values[emailIndex]?.trim() || ""
      const phone = values[phoneIndex]?.trim() || ""
      const dob = values[dobIndex]?.trim() || ""
      const notes = values[whyVolunteerIndex]?.trim() || ""

      // Extract roles from volunteer interests or roles
      const currentRoles: string[] = []
      if (values[interestsIndex]) {
        const interests = values[interestsIndex].split("||").map((i) => i.trim())
        currentRoles.push(...interests)
      }

      // Create a comprehensive notes field with all CSV data
      let fullNotes = notes ? `${notes}\n\n` : ""
      fullNotes += "CSV Data:\n"

      // Add all fields from CSV to notes
      Object.entries(allFields).forEach(([header, index]) => {
        if (values[index] && values[index].trim() !== "") {
          fullNotes += `${header}: ${values[index].trim()}\n`
        }
      })

      // Create volunteer card
      const volunteer: CardType = {
        id,
        title: `${firstName} ${lastName}`,
        description: fullNotes, // Use the comprehensive notes
        email,
        phone,
        tags: [], // No default tags
        currentRoles: [...new Set(currentRoles)], // Remove duplicates
        createdAt: values[submissionDateIndex] || new Date().toISOString(),
        attachments: [],
        data: {
          id,
          firstName,
          lastName,
          email,
          phone,
          notes: fullNotes, // Also store in data
          dob,
          submissionDate: values[submissionDateIndex],
          csvData: Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])),
          importDate: new Date().toISOString(), // Add import date to track when this data was imported
        },
      }

      volunteers.push(volunteer)
    }

    return volunteers
  } catch (error) {
    console.error("Error parsing CSV:", error)
    throw new Error(`Failed to parse CSV: ${(error as Error).message}`)
  }
}

// Helper function to parse a CSV line respecting quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      // Toggle quote state
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      // End of field
      result.push(current)
      current = ""
    } else {
      // Add character to current field
      current += char
    }
  }

  // Add the last field
  result.push(current)

  return result
}
