/**
 * Utility functions for handling images
 */

// Maximum size for images stored in localStorage (in bytes)
// Most browsers have a 5-10MB limit for all localStorage
const MAX_IMAGE_SIZE = 400 * 1024 // 400KB - reduced from 500KB for better storage

/**
 * Compresses an image to ensure it's below the maximum size for localStorage
 * @param imageDataUrl The data URL of the image to compress
 * @returns A promise that resolves to the compressed image data URL
 */
export async function compressImageForStorage(imageDataUrl: string): Promise<string> {
  // If the image is already small enough, return it as is
  if (imageDataUrl.length <= MAX_IMAGE_SIZE) {
    return imageDataUrl
  }

  // Create an image element to load the data URL
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      // Create a canvas to draw the image
      const canvas = document.createElement("canvas")
      let { width, height } = img

      // Calculate the scale factor to reduce the image size
      // Start with quality reduction before dimension reduction
      let quality = 0.5 // Initial quality - reduced from 0.6

      // For very large images, also reduce dimensions
      if (imageDataUrl.length > MAX_IMAGE_SIZE * 2) {
        // Calculate scale based on how much larger the image is
        const scale = Math.min(1, Math.sqrt(MAX_IMAGE_SIZE / imageDataUrl.length) * 2.5)
        width = Math.floor(width * scale)
        height = Math.floor(height * scale)
        quality = 0.4 // Further reduce quality for very large images
      }

      // For extremely large images, be even more aggressive
      if (imageDataUrl.length > MAX_IMAGE_SIZE * 4) {
        width = Math.floor(width * 0.6)
        height = Math.floor(height * 0.6)
        quality = 0.3 // Even lower quality for extremely large images
      }

      // Set canvas dimensions
      canvas.width = width
      canvas.height = height

      // Draw the image on the canvas
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Could not get canvas context"))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      // Convert the canvas to a data URL with reduced quality
      let compressedDataUrl = canvas.toDataURL("image/jpeg", quality)

      // If still too large, reduce quality further
      if (compressedDataUrl.length > MAX_IMAGE_SIZE) {
        compressedDataUrl = canvas.toDataURL("image/jpeg", 0.3)
      }

      // If still too large, reduce dimensions further
      if (compressedDataUrl.length > MAX_IMAGE_SIZE) {
        canvas.width = Math.floor(width * 0.5)
        canvas.height = Math.floor(height * 0.5)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        compressedDataUrl = canvas.toDataURL("image/jpeg", 0.3)
      }

      // Last resort - if still too large, make a thumbnail
      if (compressedDataUrl.length > MAX_IMAGE_SIZE) {
        canvas.width = Math.min(width, 300)
        canvas.height = Math.min(height, 300 * (height / width))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        compressedDataUrl = canvas.toDataURL("image/jpeg", 0.3)
      }

      resolve(compressedDataUrl)
    }

    img.onerror = () => {
      reject(new Error("Failed to load image for compression"))
    }

    // Set the source of the image to the data URL
    img.src = imageDataUrl
  })
}

/**
 * Gets the size of a data URL in kilobytes
 * @param dataUrl The data URL
 * @returns The size in KB
 */
export function getDataUrlSizeInKB(dataUrl: string): number {
  // Rough estimate: 3/4 of the base64 length (accounting for base64 overhead)
  return Math.round((dataUrl.length * 3) / 4 / 1024)
}

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

/**
 * Attempts to clean up localStorage by compressing all images
 * @returns A promise that resolves to true if cleanup was successful
 */
export async function cleanupLocalStorage(): Promise<boolean> {
  try {
    // Get volunteers from localStorage
    const volunteersString = localStorage.getItem("testVolunteers")
    if (!volunteersString) return false

    const volunteers = JSON.parse(volunteersString)
    let compressionCount = 0
    let totalSavings = 0

    // Compress all images
    for (const volunteer of volunteers) {
      if (volunteer.image && volunteer.image.length > 200 * 1024) {
        const originalSize = volunteer.image.length
        volunteer.image = await compressImageForStorage(volunteer.image)
        const newSize = volunteer.image.length
        const savings = originalSize - newSize

        if (savings > 0) {
          compressionCount++
          totalSavings += savings
        }
      }

      // Also compress attachments
      if (volunteer.attachments && volunteer.attachments.length > 0) {
        for (const attachment of volunteer.attachments) {
          if (attachment.url && attachment.url.length > 200 * 1024) {
            const originalSize = attachment.url.length
            attachment.url = await compressImageForStorage(attachment.url)
            const newSize = attachment.url.length
            const savings = originalSize - newSize

            if (savings > 0) {
              compressionCount++
              totalSavings += savings
            }
          }
        }
      }
    }

    // Save back to localStorage
    localStorage.setItem("testVolunteers", JSON.stringify(volunteers))

    console.log(
      `Cleaned up localStorage: compressed ${compressionCount} images, saved ${Math.round(totalSavings / 1024)}KB`,
    )
    return true
  } catch (error) {
    console.error("Error cleaning up localStorage:", error)
    return false
  }
}
