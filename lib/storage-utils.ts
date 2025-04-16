/**
 * Utility functions for handling storage
 */

/**
 * Checks if localStorage is approaching its limit
 * @returns True if localStorage is nearly full
 */
export function isLocalStorageNearlyFull(): boolean {
  try {
    // Estimate localStorage usage
    let totalSize = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        if (value) {
          totalSize += value.length
        }
      }
    }

    // Most browsers have a 5MB limit
    const estimatedLimit = 5 * 1024 * 1024
    const usagePercentage = (totalSize / estimatedLimit) * 100

    // Return true if usage is over 80%
    return usagePercentage > 80
  } catch (error) {
    console.error("Error checking localStorage size:", error)
    return false
  }
}
