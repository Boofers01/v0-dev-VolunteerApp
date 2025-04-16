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
      // Get the previous checklist items to compare
      const previousItemsString = localStorage.getItem(CHECKLIST_ITEMS_KEY)
      const previousItems: ChecklistItem[] = previousItemsString ? JSON.parse(previousItemsString) : []

      // Save the new items
      localStorage.setItem(CHECKLIST_ITEMS_KEY, JSON.stringify(items))

      // Find new items that weren't in the previous list
      const previousItemIds = new Set(previousItems.map((item) => item.id))
      const newItems = items.filter((item) => !previousItemIds.has(item.id))

      // If there are new items, update all volunteers' checklist progress
      if (newItems.length > 0) {
        console.log(`Found ${newItems.length} new checklist items, updating all volunteers...`)
        await updateAllVolunteersWithNewChecklistItems(newItems)
      }
    } catch (error) {
      console.error("Error saving checklist items to localStorage:", error)
    }
  }

  // Simulate a delay for the save operation
  await new Promise((resolve) => setTimeout(resolve, 500))

  return
}

// Helper function to update all volunteers with new checklist items
async function updateAllVolunteersWithNewChecklistItems(newItems: ChecklistItem[]): Promise<void> {
  try {
    // Get all volunteers from localStorage
    const volunteersString = localStorage.getItem("testVolunteers")
    if (!volunteersString) return

    const volunteers = JSON.parse(volunteersString)
    let updatedCount = 0

    // For each volunteer, add the new checklist items to their progress
    for (const volunteer of volunteers) {
      if (!volunteer.checklistProgress) {
        volunteer.checklistProgress = []
      }

      // Add each new item to the volunteer's progress
      let updated = false
      for (const newItem of newItems) {
        // Check if the item already exists in the volunteer's progress
        const existingItem = volunteer.checklistProgress.find(
          (progress: ChecklistProgress) => progress.itemId === newItem.id,
        )

        // If it doesn't exist, add it
        if (!existingItem) {
          volunteer.checklistProgress.push({
            itemId: newItem.id,
            completed: false,
          })
          updated = true
        }
      }

      if (updated) {
        updatedCount++

        // Also update the individual volunteer progress in localStorage
        const key = `volunteerProgress_${volunteer.id}`
        localStorage.setItem(key, JSON.stringify(volunteer.checklistProgress))
      }
    }

    // Save the updated volunteers back to localStorage
    localStorage.setItem("testVolunteers", JSON.stringify(volunteers))
    console.log(`Updated ${updatedCount} volunteers with new checklist items`)
  } catch (error) {
    console.error("Error updating volunteers with new checklist items:", error)
  }
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

        // Check if there are any new checklist items that aren't in the progress
        const progressItemIds = new Set(progress.map((p: ChecklistProgress) => p.itemId))
        const missingItems = items.filter((item) => !progressItemIds.has(item.id))

        // If there are missing items, add them to the progress
        if (missingItems.length > 0) {
          console.log(`Adding ${missingItems.length} missing checklist items to volunteer ${volunteerId}`)
          const updatedProgress = [...progress]

          for (const item of missingItems) {
            updatedProgress.push({
              itemId: item.id,
              completed: false,
            })
          }

          // Save the updated progress
          localStorage.setItem(key, JSON.stringify(updatedProgress))
          return updatedProgress
        }

        return progress
      }

      // If no progress found in dedicated storage, check the main volunteers list
      const storedVolunteers = localStorage.getItem("testVolunteers")
      if (storedVolunteers) {
        const volunteers = JSON.parse(storedVolunteers)
        const volunteer = volunteers.find((v: any) => v.id === volunteerId)

        if (volunteer && volunteer.checklistProgress) {
          console.log(`Retrieved progress from main volunteer list for ${volunteerId}:`, volunteer.checklistProgress)

          // Check if there are any new checklist items that aren't in the progress
          const progressItemIds = new Set(volunteer.checklistProgress.map((p: ChecklistProgress) => p.itemId))
          const missingItems = items.filter((item) => !progressItemIds.has(item.id))

          // If there are missing items, add them to the progress
          if (missingItems.length > 0) {
            console.log(`Adding ${missingItems.length} missing checklist items to volunteer ${volunteerId}`)
            const updatedProgress = [...volunteer.checklistProgress]

            for (const item of missingItems) {
              updatedProgress.push({
                itemId: item.id,
                completed: false,
              })
            }

            // Save the updated progress
            localStorage.setItem(key, JSON.stringify(updatedProgress))

            // Also update the volunteer in the main volunteers list
            volunteer.checklistProgress = updatedProgress
            const updatedVolunteers = volunteers.map((v: any) => (v.id === volunteerId ? volunteer : v))
            localStorage.setItem("testVolunteers", JSON.stringify(updatedVolunteers))

            return updatedProgress
          }

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
