"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Database, Upload, Download, AlertCircle, CheckCircle2, Bug, Save, RefreshCw, HardDrive } from "lucide-react"
import { debugLog } from "@/lib/debug-utils"
import { compressImageForStorage, getDataUrlSizeInKB } from "@/lib/image-utils"
import { StorageManagementDialog } from "./storage-management-dialog"

export function DataPersistenceDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<string>("backup")
  const [backupData, setBackupData] = useState<string>("")
  const [restoreData, setRestoreData] = useState<string>("")
  const [status, setStatus] = useState<{ type: "success" | "error" | "info" | "warning" | null; message: string }>({
    type: null,
    message: "",
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [isStorageDialogOpen, setIsStorageDialogOpen] = useState(false)

  // Create backup of all data
  const createBackup = async () => {
    try {
      setIsProcessing(true)
      // First, ensure we have the latest data
      const volunteers = JSON.parse(localStorage.getItem("testVolunteers") || "[]")

      // Log how many volunteers have images before backup
      const volunteersWithImages = volunteers.filter((v: any) => v.image).length
      debugLog("Before backup: volunteers with images", volunteersWithImages)

      // Create the backup data
      const data = {
        lists: localStorage.getItem("volunteerTrackerLists"),
        volunteers: JSON.stringify(volunteers), // Use our fresh copy
        checklistItems: localStorage.getItem("volunteerTrackerChecklistItems"),
      }

      const jsonData = JSON.stringify(data)
      setBackupData(jsonData)

      // Verify the backup contains image data
      try {
        const backupObj = JSON.parse(jsonData)
        const backupVolunteers = JSON.parse(backupObj.volunteers || "[]")
        const backupVolunteersWithImages = backupVolunteers.filter((v: any) => v.image).length

        debugLog("Backup created with image data", {
          totalVolunteers: backupVolunteers.length,
          volunteersWithImages: backupVolunteersWithImages,
        })

        if (backupVolunteersWithImages < volunteersWithImages) {
          setStatus({
            type: "warning",
            message: `Warning: Some image data may be missing in the backup. Original: ${volunteersWithImages}, Backup: ${backupVolunteersWithImages}`,
          })
          setIsProcessing(false)
          return
        }
      } catch (error) {
        console.error("Error verifying backup:", error)
      }

      setStatus({
        type: "success",
        message: "Backup created successfully! Copy this data and save it somewhere safe.",
      })
    } catch (error) {
      console.error("Error creating backup:", error)
      setStatus({
        type: "error",
        message: "Failed to create backup. See console for details.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Restore data from backup
  const restoreFromBackup = () => {
    try {
      setIsProcessing(true)
      if (!restoreData.trim()) {
        setStatus({
          type: "error",
          message: "Please paste your backup data first.",
        })
        setIsProcessing(false)
        return
      }

      const data = JSON.parse(restoreData)

      // Verify the backup contains image data
      try {
        const backupVolunteers = JSON.parse(data.volunteers || "[]")
        const backupVolunteersWithImages = backupVolunteers.filter((v: any) => v.image).length

        debugLog("Restoring backup with image data", {
          totalVolunteers: backupVolunteers.length,
          volunteersWithImages: backupVolunteersWithImages,
        })
      } catch (error) {
        console.error("Error verifying backup for restore:", error)
      }

      // Restore each piece of data to localStorage
      if (data.lists) localStorage.setItem("volunteerTrackerLists", data.lists)
      if (data.volunteers) localStorage.setItem("testVolunteers", data.volunteers)
      if (data.checklistItems) localStorage.setItem("volunteerTrackerChecklistItems", data.checklistItems)

      // Trigger a refresh event
      window.dispatchEvent(new CustomEvent("dataForceSaved"))

      setStatus({
        type: "success",
        message: "Data restored successfully! The board has been refreshed with your restored data.",
      })
    } catch (error) {
      console.error("Error restoring data:", error)
      setStatus({
        type: "error",
        message: "Failed to restore data. Make sure your backup data is valid JSON.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Force save all data
  const forceSaveData = async () => {
    try {
      setIsProcessing(true)
      // Get all volunteers from localStorage
      const storedVolunteersString = localStorage.getItem("testVolunteers")
      if (!storedVolunteersString) {
        setStatus({
          type: "error",
          message: "No volunteers found in localStorage.",
        })
        setIsProcessing(false)
        return
      }

      const volunteers = JSON.parse(storedVolunteersString)
      const lists = JSON.parse(localStorage.getItem("volunteerTrackerLists") || "[]")

      // Create a deep copy to avoid reference issues
      const updatedVolunteers = JSON.parse(JSON.stringify(volunteers))
      let recoveredImages = 0
      let compressedImages = 0
      let totalImages = 0

      // First pass: count existing images
      totalImages = updatedVolunteers.filter((v: any) => v.image).length

      // Second pass: recover and compress images
      for (let i = 0; i < updatedVolunteers.length; i++) {
        const volunteer = updatedVolunteers[i]

        // If volunteer already has an image, keep it and make sure it's valid
        if (volunteer.image) {
          // Verify the image data is valid
          if (typeof volunteer.image === "string" && volunteer.image.startsWith("data:")) {
            // Check if image needs compression
            if (volunteer.image.length > 750 * 1024) {
              try {
                const originalSize = getDataUrlSizeInKB(volunteer.image)
                volunteer.image = await compressImageForStorage(volunteer.image)
                const newSize = getDataUrlSizeInKB(volunteer.image)

                compressedImages++
                debugLog(`Compressed image for ${volunteer.title}`, {
                  originalSize: `${originalSize}KB`,
                  newSize: `${newSize}KB`,
                  reductionPercent: `${Math.round((1 - newSize / originalSize) * 100)}%`,
                })
              } catch (error) {
                console.error(`Error compressing image for ${volunteer.title}:`, error)
                // Continue with the uncompressed image
              }
            }
            continue
          } else {
            // Image property exists but is invalid, try to recover from attachments
            debugLog(`Invalid image data for ${volunteer.title}, attempting recovery`, {
              volunteerId: volunteer.id,
            })
            volunteer.image = null
          }
        }

        // If volunteer has attachments with images but no valid image property, set the image property
        if (volunteer.attachments && volunteer.attachments.length > 0) {
          const imageAttachment = volunteer.attachments.find(
            (att: any) => att.type?.startsWith("image/") || att.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i),
          )

          if (
            imageAttachment &&
            imageAttachment.url &&
            typeof imageAttachment.url === "string" &&
            imageAttachment.url.startsWith("data:")
          ) {
            recoveredImages++

            // Compress the image if needed
            if (imageAttachment.url.length > 750 * 1024) {
              try {
                const originalSize = getDataUrlSizeInKB(imageAttachment.url)
                const compressedUrl = await compressImageForStorage(imageAttachment.url)
                const newSize = getDataUrlSizeInKB(compressedUrl)

                compressedImages++
                debugLog(`Recovered and compressed image for ${volunteer.title}`, {
                  originalSize: `${originalSize}KB`,
                  newSize: `${newSize}KB`,
                  reductionPercent: `${Math.round((1 - newSize / originalSize) * 100)}%`,
                })

                volunteer.image = compressedUrl
              } catch (error) {
                console.error(`Error compressing recovered image for ${volunteer.title}:`, error)
                volunteer.image = imageAttachment.url
              }
            } else {
              volunteer.image = imageAttachment.url
              debugLog(`Recovered image for ${volunteer.title} from attachments`, {
                attachmentId: imageAttachment.id,
                attachmentName: imageAttachment.name,
              })
            }
          }
        }
      }

      // Count volunteers with images after recovery
      const volunteersWithImages = updatedVolunteers.filter((v: any) => v.image).length

      debugLog("Force saving data", {
        totalVolunteers: updatedVolunteers.length,
        volunteersWithImages,
        recoveredImages,
        compressedImages,
        totalLists: lists.length,
      })

      // Re-save the data to localStorage
      localStorage.setItem("testVolunteers", JSON.stringify(updatedVolunteers))

      // Trigger a custom event to notify the board to refresh
      window.dispatchEvent(new CustomEvent("dataForceSaved"))

      setStatus({
        type: "success",
        message: `Data force-saved successfully. ${volunteersWithImages} volunteers have profile images${
          recoveredImages > 0 ? ` (${recoveredImages} recovered)` : ""
        }${compressedImages > 0 ? ` (${compressedImages} compressed)` : ""}.`,
      })
    } catch (error) {
      console.error("Error force-saving data:", error)
      setStatus({
        type: "error",
        message: "Error force-saving data. See console for details.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Debug image data
  const debugImageData = async () => {
    try {
      setIsProcessing(true)
      const volunteers = JSON.parse(localStorage.getItem("testVolunteers") || "[]")

      // Count volunteers with images
      const volunteersWithImages = volunteers.filter((v: any) => v.image).length
      const volunteersWithAttachments = volunteers.filter((v: any) => v.attachments && v.attachments.length > 0).length
      const volunteersWithImageAttachments = volunteers.filter((v: any) => {
        if (!v.attachments) return false
        return v.attachments.some(
          (a: any) => a.type?.startsWith("image/") || a.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i),
        )
      }).length

      // Log detailed info about each volunteer with image data
      volunteers.forEach((volunteer: any) => {
        if (volunteer.image || (volunteer.attachments && volunteer.attachments.length > 0)) {
          const hasImageAttachments = volunteer.attachments
            ? volunteer.attachments.some(
                (a: any) => a.type?.startsWith("image/") || a.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i),
              )
            : false

          debugLog("Volunteer with image data:", {
            id: volunteer.id,
            name: volunteer.title,
            hasImageProperty: !!volunteer.image,
            imageLength: volunteer.image ? volunteer.image.length : 0,
            sizeKB: volunteer.image ? Math.round(volunteer.image.length / 1024) : 0,
            attachmentsCount: volunteer.attachments ? volunteer.attachments.length : 0,
            hasImageAttachments: hasImageAttachments,
          })
        }
      })

      setStatus({
        type: "info",
        message: `Debug complete. Found ${volunteersWithImages} volunteers with image property, ${volunteersWithImageAttachments} with image attachments, and ${volunteersWithAttachments} with any attachments. Check console for details.`,
      })
    } catch (error) {
      console.error("Error debugging image data:", error)
      setStatus({
        type: "error",
        message: "Error debugging image data. See console for details.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Backup & Restore
            </DialogTitle>
            <DialogDescription>
              Backup your data to keep it safe between deployments or restore from a previous backup.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="backup">Backup Data</TabsTrigger>
              <TabsTrigger value="restore">Restore Data</TabsTrigger>
            </TabsList>

            <TabsContent value="backup" className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  Create a backup of all your volunteer data. This will generate a JSON string that you can save and use
                  to restore your data later.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={createBackup} className="flex items-center gap-2" disabled={isProcessing}>
                    {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Generate Backup
                  </Button>
                  <Button
                    onClick={debugImageData}
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={isProcessing}
                  >
                    {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Bug className="h-4 w-4" />}
                    Debug Image Data
                  </Button>
                  <Button
                    onClick={forceSaveData}
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={isProcessing}
                  >
                    {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Force Save Data
                  </Button>
                  <Button
                    onClick={() => setIsStorageDialogOpen(true)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <HardDrive className="h-4 w-4" />
                    Manage Storage
                  </Button>
                </div>
              </div>

              {backupData && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Your Backup Data:</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(backupData)
                        setStatus({
                          type: "success",
                          message: "Backup data copied to clipboard!",
                        })
                      }}
                    >
                      Copy to Clipboard
                    </Button>
                  </div>
                  <Textarea
                    value={backupData}
                    readOnly
                    className="font-mono text-xs h-60"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                  <p className="text-xs text-gray-500">
                    Save this data somewhere safe (like a text file or note). You can use it to restore your data if
                    needed.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="restore" className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  Restore your data from a previous backup. Paste your backup data below and click "Restore Data".
                </p>
                <Textarea
                  placeholder="Paste your backup data here..."
                  value={restoreData}
                  onChange={(e) => setRestoreData(e.target.value)}
                  className="font-mono text-xs h-60"
                />
              </div>

              <Button onClick={restoreFromBackup} className="flex items-center gap-2" disabled={isProcessing}>
                {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Restore Data
              </Button>
            </TabsContent>
          </Tabs>

          {status.type && (
            <Alert variant={status.type === "error" ? "destructive" : "default"}>
              {status.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StorageManagementDialog isOpen={isStorageDialogOpen} onClose={() => setIsStorageDialogOpen(false)} />
    </>
  )
}
