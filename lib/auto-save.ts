/**
 * Utility for automatic saving of application data
 */

import { debugLog } from "./debug-utils"

// Define the keys used for localStorage
export const LISTS_STORAGE_KEY = "volunteerTrackerLists"
export const VOLUNTEERS_STORAGE_KEY = "testVolunteers"

// Track if a save is pending
let saveTimeout: NodeJS.Timeout | null = null
let pendingSaveData: { lists?: any; volunteers?: any } = {}

/**
 * Save data to localStorage with debouncing
 * @param data Object containing lists and/or volunteers to save
 * @param immediate Whether to save immediately or use debounce
 */
export function autoSave(data: { lists?: any; volunteers?: any }, immediate = false): void {
  // Merge with any pending save data
  pendingSaveData = {
    ...pendingSaveData,
    ...data,
  }

  // Clear any existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }

  // If immediate, save right away
  if (immediate) {
    performSave()
    return
  }

  // Otherwise debounce for 500ms
  saveTimeout = setTimeout(performSave, 500)
}

/**
 * Actually perform the save operation
 */
function performSave(): void {
  try {
    const startTime = performance.now()

    // Save lists if provided
    if (pendingSaveData.lists) {
      const listsToSave = pendingSaveData.lists
        .filter((list: any) => list.id !== "all-volunteers-list")
        .map((list: any) => ({
          id: list.id,
          title: list.title,
        }))
      localStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(listsToSave))
    }

    // Save volunteers if provided
    if (pendingSaveData.volunteers) {
      localStorage.setItem(VOLUNTEERS_STORAGE_KEY, JSON.stringify(pendingSaveData.volunteers))
    }

    const endTime = performance.now()
    debugLog("Auto-save completed", {
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      savedLists: pendingSaveData.lists ? pendingSaveData.lists.length : 0,
      savedVolunteers: pendingSaveData.volunteers ? pendingSaveData.volunteers.length : 0,
    })

    // Clear pending data
    pendingSaveData = {}

    // Dispatch event to notify components that data was saved
    window.dispatchEvent(new CustomEvent("dataSaved"))
  } catch (error) {
    console.error("Error during auto-save:", error)
    debugLog("Auto-save failed", { error: String(error) })
  }
}

/**
 * Force an immediate save of all data
 * @param lists Lists to save
 * @param volunteers Volunteers to save
 */
export function forceSave(lists: any, volunteers: any): void {
  autoSave({ lists, volunteers }, true)

  // Dispatch event to notify components that data was force saved
  window.dispatchEvent(new CustomEvent("dataForceSaved"))
}

/**
 * Load all data from localStorage
 * @returns Object containing lists and volunteers
 */
export function loadAllData(): { lists: any[]; volunteers: any[] } {
  try {
    // Load volunteers
    const savedVolunteers = localStorage.getItem(VOLUNTEERS_STORAGE_KEY)
    let volunteers: any[] = []

    if (savedVolunteers) {
      volunteers = JSON.parse(savedVolunteers)
    }

    // Load lists
    const savedLists = localStorage.getItem(LISTS_STORAGE_KEY)
    let lists: any[] = []

    if (savedLists) {
      lists = JSON.parse(savedLists)
    } else {
      // Initialize with default lists if none exist
      lists = [
        { id: "1", title: "New Applications" },
        { id: "2", title: "In Progress" },
        { id: "3", title: "Ready to Start" },
        { id: "4", title: "Active Volunteers" },
      ]

      // Save the default lists
      localStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(lists))
    }

    return { lists, volunteers }
  } catch (error) {
    console.error("Error loading data:", error)
    debugLog("Data load failed", { error: String(error) })
    return { lists: [], volunteers: [] }
  }
}
