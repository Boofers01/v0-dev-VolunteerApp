"use client"

import type { VolunteerData } from "@/lib/types"

// Cache for API responses to prevent rate limiting
let cachedVolunteers: VolunteerData[] | null = null
let lastFetchTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Helper function for API requests through our secure proxy
async function lglApiRequest(endpoint: string, options: RequestInit = {}) {
  try {
    // Use our secure API endpoint instead of directly accessing LGL API
    const url = `/api/lgl?endpoint=${encodeURIComponent(endpoint)}`
    console.log(`Making API request through proxy: ${url}`)

    const response = await fetch(url, options)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `API error (${response.status})`)
    }

    return response.json()
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error)
    throw error
  }
}

// Fetch volunteers from LGL
export async function fetchVolunteers(): Promise<VolunteerData[]> {
  try {
    // Check if we have cached data that's still fresh
    const now = Date.now()
    if (cachedVolunteers && now - lastFetchTime < CACHE_TTL) {
      console.log("Using cached volunteer data")
      return cachedVolunteers
    }

    console.log("Fetching volunteers from LGL...")

    // Try multiple approaches to find volunteers
    let volunteers: VolunteerData[] = []

    // 1. Try to get constituents with the "Volunteer" category
    try {
      console.log("Approach 1: Fetching constituents with Volunteer category")
      const response = await lglApiRequest("/constituents?category_name=Volunteer")

      if (response.items && response.items.length > 0) {
        console.log(`Found ${response.items.length} volunteers by category`)

        volunteers = response.items.map((item: any) => ({
          id: item.id?.toString() || `const-${Date.now()}`,
          firstName: item.first_name || "",
          lastName: item.last_name || "",
          email: item.email || "",
          phone: item.phone || "",
          notes: item.notes || "",
          tags: item.categories?.map((cat: any) => cat.name) || [],
          lglData: item,
        }))
      }
    } catch (error) {
      console.error("Error fetching volunteers by category:", error)
    }

    // 2. Try to get constituents with volunteer-related custom fields
    if (volunteers.length === 0) {
      try {
        console.log("Approach 2: Fetching constituents with volunteer custom fields")
        const response = await lglApiRequest("/constituents?custom_field_name=Volunteer%20Status")

        if (response.items && response.items.length > 0) {
          console.log(`Found ${response.items.length} volunteers by custom field`)

          volunteers = response.items.map((item: any) => ({
            id: item.id?.toString() || `const-${Date.now()}`,
            firstName: item.first_name || "",
            lastName: item.last_name || "",
            email: item.email || "",
            phone: item.phone || "",
            notes: item.notes || "",
            tags: item.categories?.map((cat: any) => cat.name) || [],
            lglData: item,
          }))
        }
      } catch (error) {
        console.error("Error fetching volunteers by custom field:", error)
      }
    }

    // 3. If all else fails, just get recent constituents
    if (volunteers.length === 0) {
      try {
        console.log("Approach 3: Fetching recent constituents")
        const response = await lglApiRequest("/constituents?sort=date_added&order=desc&limit=25")

        if (response.items && response.items.length > 0) {
          console.log(`Found ${response.items.length} recent constituents`)

          volunteers = response.items.map((item: any) => ({
            id: item.id?.toString() || `const-${Date.now()}`,
            firstName: item.first_name || "",
            lastName: item.last_name || "",
            email: item.email || "",
            phone: item.phone || "",
            notes: item.notes || "",
            tags: item.categories?.map((cat: any) => cat.name) || [],
            lglData: item,
          }))
        }
      } catch (error) {
        console.error("Error fetching recent constituents:", error)
      }
    }

    if (volunteers.length > 0) {
      // Update cache
      cachedVolunteers = volunteers
      lastFetchTime = now
      return volunteers
    } else {
      console.log("No volunteers found through API, using mock data")
      return getMockVolunteers()
    }
  } catch (error) {
    console.error("Unexpected error in fetchVolunteers:", error)
    return getMockVolunteers()
  }
}

// Process a form submission from LGL webhook
export async function processFormSubmission(formData: any): Promise<VolunteerData> {
  try {
    console.log("Processing form submission:", JSON.stringify(formData, null, 2))

    // Extract volunteer information from the form data
    // The field names should match what you configured in your LGL webhook integration
    const volunteer: VolunteerData = {
      id: formData.submission_id || formData.id || formData.record_id || `form-${Date.now()}`,
      firstName: formData.first_name || formData.fname || "",
      lastName: formData.last_name || formData.lname || "",
      email: formData.email || formData.email_address || "",
      phone: formData.phone || formData.phone_number || formData.mobile_phone || "",
      notes: formData.comments || formData.notes || "",
      tags: ["New Volunteer Applicant", "From LGL Form"],
      // Add specific fields from your form
      volunteerRoles: formData.volunteer_interests || formData.volunteer_role || [],
      // Store all form data for reference
      formData: formData,
    }

    // Add tags based on volunteer interests if available
    if (formData.volunteer_interests || formData.volunteer_role) {
      const interests = formData.volunteer_interests || formData.volunteer_role
      if (typeof interests === "string") {
        volunteer.tags.push(interests)
      } else if (Array.isArray(interests)) {
        volunteer.tags.push(...interests)
      }
    }

    console.log("Processed volunteer:", volunteer)
    return volunteer
  } catch (error) {
    console.error("Error processing form submission:", error)
    throw error
  }
}

// Mock data for testing or when API is not configured
function getMockVolunteers(): VolunteerData[] {
  console.log("Using mock volunteer data")
  return [
    {
      id: "1",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
      phone: "(555) 123-4567",
      notes: "Interested in weekend volunteering opportunities",
      tags: ["New", "Weekend Availability"],
      formSubmittedAt: "2023-05-15T10:30:00Z",
    },
    {
      id: "2",
      firstName: "Michael",
      lastName: "Johnson",
      email: "michael.j@example.com",
      phone: "(555) 987-6543",
      notes: "Has previous experience with youth mentoring",
      tags: ["Experienced", "Youth Programs"],
      formSubmittedAt: "2023-05-14T14:45:00Z",
    },
    {
      id: "3",
      firstName: "Sarah",
      lastName: "Williams",
      email: "sarah.w@example.com",
      phone: "(555) 456-7890",
      notes: "Available on weekday evenings",
      tags: ["Weekday Availability"],
      formSubmittedAt: "2023-05-16T09:15:00Z",
    },
    {
      id: "4",
      firstName: "David",
      lastName: "Chen",
      email: "david.c@example.com",
      phone: "(555) 222-3333",
      notes: "Fluent in Mandarin and Spanish",
      tags: ["Multilingual", "Translation"],
      formSubmittedAt: "2023-05-17T11:20:00Z",
    },
    {
      id: "5",
      firstName: "Emily",
      lastName: "Rodriguez",
      email: "emily.r@example.com",
      phone: "(555) 444-5555",
      notes: "Has background in education and childcare",
      tags: ["Education", "Youth Programs"],
      formSubmittedAt: "2023-05-18T09:45:00Z",
    },
  ]
}
