"use client"

import type { ChecklistItem, ChecklistProgress } from "@/lib/types"

// Local storage key for checklist items
const CHECKLIST_ITEMS_KEY = "volunteerTrackerChecklistItems"

// Default checklist items
const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "1",
    text: "Complete application form",
    order: 0,
    showScheduledDate: true,
    showCompletedDate: true,
  },
  {
    id: "2",
    text: "Background check submitted",
    order: 1,
    showScheduledDate: true,
    showCompletedDate: true,
  },
  {
    id: "3",
    text: "Background check cleared",
    order: 2,
    showScheduledDate: true,
    showCompletedDate: true,
  },
  {
    id: "4",
    text: "Orientation completed",
    order: 3,
    showScheduledDate: true,
    showCompletedDate: true,
  },
  {
    id: "5",
    text: "Training session 1 completed",
    order: 4,
    showScheduledDate: true,
    showCompletedDate: true,
  },
  {
    id: "6",
    text: "Training session 2 completed",
    order: 5,
    showScheduledDate: true,
    showCompletedDate: true,
  },
  {
    id: "7",
    text: "Signed confidentiality agreement",
    order: 6,
    showScheduledDate: true,
    showCompletedDate: true,
  },
  {
    id: "8",
    text: "Emergency contact information provided",
    order: 7,
    showScheduledDate: true,
    showCompletedDate: true,
  },
]

export async function getChecklistItems(): Promise<ChecklistItem[]> {
  // In a client-side environment, get from localStorage
  if (typeof window !== "undefined") {
    try {
      const storedItems = localStorage.getItem(CHECKLIST_ITEMS_KEY)
      if (storedItems) {
        return JSON.parse(storedItems)
      }
      // If no items in localStorage, store the defaults
      localStorage.setItem(CHECKLIST_ITEMS_KEY, JSON.stringify(DEFAULT_CHECKLIST_ITEMS))
    } catch (error) {
      console.error("Error reading checklist items from localStorage:", error)
    }
  }

  // Return default items
  return [...DEFAULT_CHECKLIST_ITEMS].sort((a, b) => a.order - b.order)
}

export async function saveChecklistItems(items: ChecklistItem[]): Promise<void> {
  // In a client-side environment, save to localStorage
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(CHECKLIST_ITEMS_KEY, JSON.stringify(items))
    } catch (error) {
      console.error("Error saving checklist items to localStorage:", error)
    }
  }

  // Simulate a delay for the save operation
  await new Promise((resolve) => setTimeout(resolve, 500))

  return
}

export async function getVolunteerChecklistProgress(volunteerId: string): Promise<ChecklistProgress[]> {
  // Get the checklist items
  const items = await getChecklistItems()

  // Try to get existing progress from localStorage
  if (typeof window !== "undefined") {
    try {
      const key = `volunteerProgress_${volunteerId}`
      const storedProgress = localStorage.getItem(key)

      if (storedProgress) {
        const progress = JSON.parse(storedProgress)
        console.log(`Retrieved progress for volunteer ${volunteerId}:`, progress)
        return progress
      }

      // If no progress found in dedicated storage, check the main volunteers list
      const storedVolunteers = localStorage.getItem("testVolunteers")
      if (storedVolunteers) {
        const volunteers = JSON.parse(storedVolunteers)
        const volunteer = volunteers.find((v: any) => v.id === volunteerId)

        if (volunteer && volunteer.checklistProgress) {
          console.log(`Retrieved progress from main volunteer list for ${volunteerId}:`, volunteer.checklistProgress)
          return volunteer.checklistProgress
        }
      }
    } catch (error) {
      console.error("Error reading volunteer progress from localStorage:", error)
    }
  }

  // Generate default progress for this volunteer
  const progress: ChecklistProgress[] = items.map((item) => ({
    itemId: item.id,
    completed: false,
  }))

  return progress
}

export async function updateVolunteerChecklistProgress(
  volunteerId: string,
  progress: ChecklistProgress[],
): Promise<void> {
  // In a client-side environment, save to localStorage
  if (typeof window !== "undefined") {
    try {
      const key = `volunteerProgress_${volunteerId}`

      // Log the progress being saved for debugging
      console.log(`Saving progress for volunteer ${volunteerId}:`, progress)

      // Save the progress to localStorage
      localStorage.setItem(key, JSON.stringify(progress))

      // Also update the volunteer in the main volunteers list
      const storedVolunteers = localStorage.getItem("testVolunteers")
      if (storedVolunteers) {
        const volunteers = JSON.parse(storedVolunteers)
        const volunteerIndex = volunteers.findIndex((v: any) => v.id === volunteerId)

        if (volunteerIndex !== -1) {
          volunteers[volunteerIndex].checklistProgress = progress
          localStorage.setItem("testVolunteers", JSON.stringify(volunteers))
          console.log(`Updated checklist progress in main volunteer list for ${volunteerId}`)
        }
      }
    } catch (error) {
      console.error("Error saving volunteer progress to localStorage:", error)
    }
  }

  // Simulate a delay for the save operation
  await new Promise((resolve) => setTimeout(resolve, 500))

  return
}
