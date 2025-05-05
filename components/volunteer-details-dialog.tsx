"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { X, Plus, Upload, Check, Calendar, CheckCircle, FileText, ImageIcon } from "lucide-react"
import type { Volunteer, Attachment, ChecklistProgress, ChecklistItem } from "@/lib/types"
import {
  getVolunteerChecklistProgress,
  updateVolunteerChecklistProgress,
  getChecklistItems,
} from "@/lib/checklist-service"
import { debugLog } from "@/lib/debug-utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { compressImageForStorage, getDataUrlSizeInKB, isLocalStorageNearlyFull } from "@/lib/image-utils"

interface VolunteerDetailsDialogProps {
  volunteer: Volunteer
  isOpen: boolean
  onClose: () => void
  onUpdate: (updatedVolunteer: Volunteer) => void
}

export function VolunteerDetailsDialog({ volunteer, isOpen, onClose, onUpdate }: VolunteerDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState("details")
  const [editedVolunteer, setEditedVolunteer] = useState<Volunteer>({ ...volunteer })
  const [newTag, setNewTag] = useState("")
  const [newRole, setNewRole] = useState("")
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [checklistProgress, setChecklistProgress] = useState<ChecklistProgress[]>([])
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "warning" | null; message: string }>(
    {
      type: null,
      message: "",
    },
  )
  const [isProcessing, setIsProcessing] = useState(false)
  // Track which popover is open
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)

  // Initialize state from volunteer prop
  useEffect(() => {
    if (isOpen) {
      debugLog("VolunteerDetailsDialog opened with volunteer", {
        id: volunteer.id,
        name: volunteer.title,
        hasImage: !!volunteer.image,
        imageLength: volunteer.image ? volunteer.image.length : 0,
      })

      // Create a deep copy to avoid reference issues
      const volunteerCopy = JSON.parse(JSON.stringify(volunteer))

      // Initialize tags and roles arrays if they don't exist
      if (!volunteerCopy.tags) volunteerCopy.tags = []
      if (!volunteerCopy.currentRoles) volunteerCopy.currentRoles = []
      if (!volunteerCopy.attachments) volunteerCopy.attachments = []

      setEditedVolunteer(volunteerCopy)

      // Load checklist data
      loadChecklistData()

      // Clear any previous status messages
      setStatusMessage({ type: null, message: "" })
    }
  }, [volunteer, isOpen])

  const loadChecklistData = async () => {
    try {
      debugLog("Loading checklist data for volunteer", { id: volunteer.id })
      const items = await getChecklistItems()
      setChecklistItems(items)

      const progress = await getVolunteerChecklistProgress(volunteer.id)
      debugLog("Loaded checklist progress", { progress })

      // Ensure all checklist items have corresponding progress entries
      const progressMap = new Map(progress.map((p) => [p.itemId, p]))
      const updatedProgress = [...progress]
      let progressUpdated = false

      // Check for missing items and add them
      for (const item of items) {
        if (!progressMap.has(item.id)) {
          updatedProgress.push({
            itemId: item.id,
            completed: false,
          })
          progressUpdated = true
          debugLog("Added missing checklist item to progress", { itemId: item.id })
        }
      }

      // If progress was updated, save it
      if (progressUpdated) {
        await updateVolunteerChecklistProgress(volunteer.id, updatedProgress)
        debugLog("Updated volunteer checklist progress with missing items", {
          volunteerId: volunteer.id,
          updatedProgress,
        })
      }

      setChecklistProgress(updatedProgress)
    } catch (error) {
      console.error("Error loading checklist data:", error)
    }
  }

  // Function to update volunteer in localStorage
  const updateVolunteerInLocalStorage = async (updatedVolunteer: Volunteer): Promise<boolean> => {
    try {
      setIsProcessing(true)

      // Get all volunteers from localStorage
      const storedVolunteersString = localStorage.getItem("testVolunteers")
      if (!storedVolunteersString) {
        console.error("No volunteers found in localStorage")
        setIsProcessing(false)
        return false
      }

      const volunteers = JSON.parse(storedVolunteersString)

      // Find the volunteer to update
      const volunteerIndex = volunteers.findIndex((v: Volunteer) => v.id === updatedVolunteer.id)

      if (volunteerIndex !== -1) {
        // Create a new array with the updated volunteer
        const updatedVolunteers = [...volunteers]

        // Preserve the image if it exists in the current version but not in the updated version
        if (!updatedVolunteer.image && volunteers[volunteerIndex].image) {
          updatedVolunteer.image = volunteers[volunteerIndex].image
          debugLog("Preserved existing image during update", {
            volunteerId: updatedVolunteer.id,
            volunteerName: updatedVolunteer.title,
          })
        }

        // Ensure attachments array exists
        if (!updatedVolunteer.attachments) {
          updatedVolunteer.attachments = []
        }

        // Compress image if it's too large
        if (updatedVolunteer.image && updatedVolunteer.image.length > 750 * 1024) {
          try {
            const originalSize = getDataUrlSizeInKB(updatedVolunteer.image)
            updatedVolunteer.image = await compressImageForStorage(updatedVolunteer.image)
            const newSize = getDataUrlSizeInKB(updatedVolunteer.image)

            debugLog(`Compressed image for ${updatedVolunteer.title}`, {
              originalSize: `${originalSize}KB`,
              newSize: `${newSize}KB`,
              reductionPercent: `${Math.round((1 - newSize / originalSize) * 100)}%`,
            })
          } catch (error) {
            console.error("Error compressing image:", error)
            // Continue with the uncompressed image if compression fails
          }
        }

        // Also compress any large image attachments
        if (updatedVolunteer.attachments && updatedVolunteer.attachments.length > 0) {
          for (let i = 0; i < updatedVolunteer.attachments.length; i++) {
            const attachment = updatedVolunteer.attachments[i]
            if (attachment.type?.startsWith("image/") && attachment.url && attachment.url.length > 750 * 1024) {
              try {
                const originalSize = getDataUrlSizeInKB(attachment.url)
                attachment.url = await compressImageForStorage(attachment.url)
                const newSize = getDataUrlSizeInKB(attachment.url)

                debugLog(`Compressed attachment for ${updatedVolunteer.title}`, {
                  attachmentName: attachment.name,
                  originalSize: `${originalSize}KB`,
                  newSize: `${newSize}KB`,
                  reductionPercent: `${Math.round((1 - newSize / originalSize) * 100)}%`,
                })
              } catch (error) {
                console.error("Error compressing attachment image:", error)
                // Continue with the uncompressed image if compression fails
              }
            }
          }
        }

        // Update the volunteer
        updatedVolunteers[volunteerIndex] = updatedVolunteer

        // Save back to localStorage
        localStorage.setItem("testVolunteers", JSON.stringify(updatedVolunteers))

        // Log the update
        debugLog("Updated volunteer in localStorage", {
          id: updatedVolunteer.id,
          name: updatedVolunteer.title,
          hasImage: !!updatedVolunteer.image,
          imageLength: updatedVolunteer.image ? updatedVolunteer.image.length : 0,
          checklistProgress: updatedVolunteer.checklistProgress,
        })

        // Count volunteers with images for debugging
        const volunteersWithImages = updatedVolunteers.filter((v: any) => v.image).length
        debugLog(`After update: ${volunteersWithImages} volunteers have images`)

        setIsProcessing(false)
        return true
      } else {
        console.error(`Volunteer with ID ${updatedVolunteer.id} not found in localStorage`)
        setIsProcessing(false)
        return false
      }
    } catch (error) {
      console.error("Error updating volunteer in localStorage:", error)
      setIsProcessing(false)
      return false
    }
  }

  const handleSave = async () => {
    // Make sure to include the updated checklist progress
    const updatedVolunteer = {
      ...editedVolunteer,
      checklistProgress: checklistProgress,
    }

    debugLog("Saving volunteer with complete data", {
      id: updatedVolunteer.id,
      name: updatedVolunteer.title,
      hasImage: !!updatedVolunteer.image,
      imageLength: updatedVolunteer.image ? updatedVolunteer.image.length : 0,
      attachmentsCount: updatedVolunteer.attachments ? updatedVolunteer.attachments.length : 0,
      checklistProgress: updatedVolunteer.checklistProgress,
    })

    setIsProcessing(true)

    // Update in localStorage
    const success = await updateVolunteerInLocalStorage(updatedVolunteer)

    if (success) {
      // Update in parent component
      onUpdate(updatedVolunteer)
      onClose()
    } else {
      setStatusMessage({
        type: "error",
        message: "Failed to save changes. Please try again.",
      })
      setIsProcessing(false)
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !editedVolunteer.tags.includes(newTag.trim())) {
      const updatedTags = [...editedVolunteer.tags, newTag.trim()]

      // Update the edited volunteer
      setEditedVolunteer({ ...editedVolunteer, tags: updatedTags })
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = editedVolunteer.tags.filter((tag) => tag !== tagToRemove)

    // Update the edited volunteer
    setEditedVolunteer({ ...editedVolunteer, tags: updatedTags })
  }

  const handleAddRole = () => {
    if (newRole.trim() && !editedVolunteer.currentRoles.includes(newRole.trim())) {
      const updatedRoles = [...editedVolunteer.currentRoles, newRole.trim()]

      // Update the edited volunteer
      setEditedVolunteer({ ...editedVolunteer, currentRoles: updatedRoles })
      setNewRole("")
    }
  }

  const handleRemoveRole = (roleToRemove: string) => {
    const updatedRoles = editedVolunteer.currentRoles.filter((role) => role !== roleToRemove)

    // Update the edited volunteer
    setEditedVolunteer({ ...editedVolunteer, currentRoles: updatedRoles })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    setIsProcessing(true)

    try {
      // Check if localStorage is nearly full
      if (isLocalStorageNearlyFull()) {
        setStatusMessage({
          type: "warning",
          message: "Storage is nearly full. The image will be heavily compressed.",
        })
      }

      // Check file size before reading
      if (file.size > 15 * 1024 * 1024) {
        // 15MB limit
        setStatusMessage({
          type: "error",
          message: "File is too large. Maximum size is 15MB.",
        })
        setIsProcessing(false)
        return
      }

      // Read the file
      const dataUrl = await readFileAsDataURL(file)

      // Create attachment object
      const attachment: Attachment = {
        id: Date.now().toString(),
        name: file.name,
        type: file.type,
        url: dataUrl,
        uploadedAt: new Date().toISOString(),
      }

      // Log original file size
      const originalSizeKB = Math.round(dataUrl.length / 1024)
      debugLog("Created new attachment", {
        id: attachment.id,
        name: attachment.name,
        type: attachment.type,
        sizeKB: originalSizeKB,
      })

      // Compress image if it's an image - use more aggressive compression
      if (file.type.startsWith("image/")) {
        try {
          // Create a temporary image element
          const img = new Image()
          await new Promise((resolve) => {
            img.onload = resolve
            img.src = dataUrl
          })

          // Create a canvas with reduced dimensions
          const canvas = document.createElement("canvas")
          // Reduce to 400px max dimension for better storage efficiency
          const maxDimension = 400
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > maxDimension) {
              height = Math.floor(height * (maxDimension / width))
              width = maxDimension
            }
          } else {
            if (height > maxDimension) {
              width = Math.floor(width * (maxDimension / height))
              height = maxDimension
            }
          }

          canvas.width = width
          canvas.height = height

          // Draw and compress
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height)

            // Use lower quality for JPEG compression
            attachment.url = canvas.toDataURL("image/jpeg", 0.4)

            const newSizeKB = Math.round(attachment.url.length / 1024)

            debugLog("Compressed image attachment", {
              originalSizeKB,
              newSizeKB,
              reductionPercent: `${Math.round((1 - newSizeKB / originalSizeKB) * 100)}%`,
            })
          }
        } catch (error) {
          console.error("Error compressing image:", error)
          // Continue with the uncompressed image
        }
      }

      const updatedAttachments = [...editedVolunteer.attachments, attachment]

      // If this is an image and there's no profile image set, automatically set it
      let updatedImage = editedVolunteer.image
      if (file.type.startsWith("image/") && !editedVolunteer.image) {
        updatedImage = attachment.url
        debugLog("Automatically setting profile image from new attachment", {
          attachmentId: attachment.id,
          attachmentName: attachment.name,
        })

        setStatusMessage({
          type: "success",
          message: "Image uploaded and set as profile picture",
        })
      } else {
        setStatusMessage({
          type: "success",
          message: "File uploaded successfully",
        })
      }

      // Update the edited volunteer
      setEditedVolunteer({
        ...editedVolunteer,
        attachments: updatedAttachments,
        image: updatedImage,
      })
    } catch (error) {
      console.error("Error processing file upload:", error)
      setStatusMessage({
        type: "error",
        message: "Error processing file. Please try again.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Helper function to read a file as a data URL
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result
        if (typeof result === "string") {
          resolve(result)
        } else {
          reject(new Error("Failed to read file as data URL"))
        }
      }
      reader.onerror = () => reject(new Error("Error reading file"))
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveAttachment = (attachmentId: string) => {
    const updatedAttachments = editedVolunteer.attachments.filter((att) => att.id !== attachmentId)

    // Check if we're removing the attachment that's used as the profile image
    const removedAttachment = editedVolunteer.attachments.find((att) => att.id === attachmentId)
    let updatedImage = editedVolunteer.image

    if (removedAttachment && removedAttachment.url === editedVolunteer.image) {
      // If we're removing the attachment used as profile image, set image to null
      updatedImage = null
      debugLog("Removed attachment was used as profile image - completely removing profile image", {
        attachmentId,
      })

      setStatusMessage({
        type: "success",
        message: "Attachment and profile picture removed successfully to save space.",
      })
    } else {
      setStatusMessage({
        type: "success",
        message: "Attachment removed successfully",
      })
    }

    // Update the edited volunteer
    setEditedVolunteer({
      ...editedVolunteer,
      attachments: updatedAttachments,
      image: updatedImage,
    })
  }

  const handleSetProfilePicture = async (attachment: Attachment) => {
    if (!attachment || !attachment.url) {
      console.error("Invalid attachment or missing URL")
      setStatusMessage({
        type: "error",
        message: "Invalid attachment. Cannot set as profile picture.",
      })
      return
    }

    setIsProcessing(true)

    try {
      debugLog("Setting profile picture", {
        attachmentId: attachment.id,
        attachmentType: attachment.type,
        urlLength: attachment.url.length,
      })

      // Compress the image if it's too large
      let imageUrl = attachment.url
      if (attachment.url.length > 750 * 1024) {
        const originalSize = getDataUrlSizeInKB(attachment.url)
        imageUrl = await compressImageForStorage(attachment.url)
        const newSize = getDataUrlSizeInKB(imageUrl)

        debugLog("Compressed profile picture", {
          originalSize: `${originalSize}KB`,
          newSize: `${newSize}KB`,
          reductionPercent: `${Math.round((1 - newSize / originalSize) * 100)}%`,
        })
      }

      // Update the edited volunteer with the image URL
      setEditedVolunteer({ ...editedVolunteer, image: imageUrl })

      setStatusMessage({
        type: "success",
        message: "Profile picture updated successfully",
      })
    } catch (error) {
      console.error("Error setting profile picture:", error)
      setStatusMessage({
        type: "error",
        message: "Failed to set profile picture. Please try again.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleChecklistItemToggle = async (itemId: string, completed: boolean) => {
    debugLog("Toggling checklist item", { itemId, completed })

    // Create a new array with the updated progress
    const updatedProgress = checklistProgress.map((item) => {
      if (item.itemId === itemId) {
        return {
          ...item,
          completed: completed,
          completedAt: completed ? new Date().toISOString() : undefined,
          completedBy: completed ? "Current User" : undefined,
        }
      }
      return item
    })

    // Update the state
    setChecklistProgress(updatedProgress)

    // Update the volunteer's checklist progress
    await updateVolunteerChecklistProgress(volunteer.id, updatedProgress)

    // Update the edited volunteer with the checklist progress
    setEditedVolunteer({ ...editedVolunteer, checklistProgress: updatedProgress })

    // Show a status message to confirm the item was checked/unchecked
    setStatusMessage({
      type: "success",
      message: completed ? "Checklist item completed" : "Checklist item marked as incomplete",
    })

    // Clear the status message after a few seconds
    setTimeout(() => {
      setStatusMessage({ type: null, message: "" })
    }, 3000)

    // Force save after toggling a checklist item
    window.dispatchEvent(new CustomEvent("saveAllData"))
  }

  const handleScheduledDateChange = async (itemId: string, date: Date | undefined) => {
    debugLog("Setting scheduled date", { itemId, date: date?.toISOString() })

    // Close the popover
    setOpenPopoverId(null)

    // Create a new array with the updated progress
    const updatedProgress = checklistProgress.map((item) => {
      if (item.itemId === itemId) {
        return {
          ...item,
          scheduledDate: date ? date.toISOString() : undefined,
        }
      }
      return item
    })

    // Update the state
    setChecklistProgress(updatedProgress)

    // Update the volunteer's checklist progress in localStorage
    await updateVolunteerChecklistProgress(volunteer.id, updatedProgress)

    // Update the edited volunteer with the checklist progress
    setEditedVolunteer((prev) => ({
      ...prev,
      checklistProgress: updatedProgress,
    }))

    // Show a status message to confirm the date was set
    setStatusMessage({
      type: "success",
      message: date ? `Scheduled date set to ${format(date, "MMM d, yyyy")}` : "Scheduled date cleared",
    })

    // Clear the status message after a few seconds
    setTimeout(() => {
      setStatusMessage({ type: null, message: "" })
    }, 3000)

    // Force save after changing a date
    window.dispatchEvent(new CustomEvent("saveAllData"))
  }

  const handleCompletedDateChange = async (itemId: string, date: Date | undefined) => {
    debugLog("Setting completed date", { itemId, date: date?.toISOString() })

    // Close the popover
    setOpenPopoverId(null)

    // Create a new array with the updated progress
    const updatedProgress = checklistProgress.map((item) => {
      if (item.itemId === itemId) {
        return {
          ...item,
          completedAt: date ? date.toISOString() : undefined,
          completedBy: date ? "Current User" : undefined,
          // If a date is set, mark as completed
          completed: date ? true : item.completed,
        }
      }
      return item
    })

    // Update the state
    setChecklistProgress(updatedProgress)

    // Update the volunteer's checklist progress in localStorage
    await updateVolunteerChecklistProgress(volunteer.id, updatedProgress)

    // Update the edited volunteer with the checklist progress
    setEditedVolunteer((prev) => ({
      ...prev,
      checklistProgress: updatedProgress,
    }))

    // Show a status message to confirm the date was set
    setStatusMessage({
      type: "success",
      message: date ? `Completed date set to ${format(date, "MMM d, yyyy")}` : "Completed date cleared",
    })

    // Clear the status message after a few seconds
    setTimeout(() => {
      setStatusMessage({ type: null, message: "" })
    }, 3000)

    // Force save after changing a date
    window.dispatchEvent(new CustomEvent("saveAllData"))
  }

  // Get initials for avatar fallback
  const getInitials = () => {
    const nameParts = editedVolunteer.title.split(" ")
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    }
    return nameParts[0].substring(0, 2).toUpperCase()
  }

  // Get file size in human-readable format
  const getFileSizeDisplay = (dataUrl: string) => {
    const sizeKB = Math.round(dataUrl.length / 1024)
    return sizeKB < 1024 ? `${sizeKB} KB` : `${(sizeKB / 1024).toFixed(1)} MB`
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Volunteer Details</DialogTitle>
        </DialogHeader>

        {statusMessage.type && (
          <Alert variant={statusMessage.type === "error" ? "destructive" : "default"} className="mb-4">
            <AlertDescription className="flex items-center gap-2">
              {statusMessage.type === "success" && <CheckCircle className="h-4 w-4" />}
              {statusMessage.message}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="roles">Roles & Tags</TabsTrigger>
            <TabsTrigger value="attachments">Attachments</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={editedVolunteer.image || ""} alt={editedVolunteer.title} />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{editedVolunteer.title}</h3>
                <p className="text-sm text-gray-500">{editedVolunteer.email}</p>
                {editedVolunteer.image && (
                  <p className="text-xs text-gray-400">Image size: {getFileSizeDisplay(editedVolunteer.image)}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Name</Label>
                <Input
                  id="title"
                  value={editedVolunteer.title}
                  onChange={(e) => setEditedVolunteer({ ...editedVolunteer, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={editedVolunteer.email}
                  onChange={(e) => setEditedVolunteer({ ...editedVolunteer, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editedVolunteer.phone}
                  onChange={(e) => setEditedVolunteer({ ...editedVolunteer, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="createdAt">Created At</Label>
                <Input id="createdAt" value={editedVolunteer.createdAt} disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Notes</Label>
              <Textarea
                id="description"
                value={editedVolunteer.description}
                onChange={(e) => setEditedVolunteer({ ...editedVolunteer, description: e.target.value })}
                className="min-h-[150px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Roles</h3>
              <div className="flex flex-wrap gap-2">
                {editedVolunteer.currentRoles?.map((role, index) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-1 py-1 px-3">
                    {role}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveRole(role)} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a role..."
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddRole()
                    }
                  }}
                />
                <Button onClick={handleAddRole} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {editedVolunteer.tags?.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1 py-1 px-3">
                    {tag}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                />
                <Button onClick={handleAddTag} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="attachments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Attachments</h3>
              <div>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" size="sm" className="cursor-pointer" asChild disabled={isProcessing}>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              {editedVolunteer.attachments?.length === 0 ? (
                <p className="text-sm text-gray-500">No attachments yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editedVolunteer.attachments?.map((attachment) => (
                    <div key={attachment.id} className="border rounded-md p-3 flex flex-col gap-2">
                      {attachment.type?.startsWith("image/") ? (
                        <div className="relative h-40 bg-gray-100 rounded-md overflow-hidden">
                          <img
                            src={attachment.url || "/placeholder.svg"}
                            alt={attachment.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-40 flex items-center justify-center bg-gray-100 rounded-md">
                          <FileText className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <p className="text-sm truncate max-w-[200px]">{attachment.name}</p>
                          <p className="text-xs text-gray-400">
                            {attachment.url ? getFileSizeDisplay(attachment.url) : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {attachment.type?.startsWith("image/") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetProfilePicture(attachment)}
                              className={editedVolunteer.image === attachment.url ? "bg-green-50 text-green-600" : ""}
                              disabled={isProcessing}
                            >
                              {editedVolunteer.image === attachment.url ? (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Current Profile
                                </>
                              ) : (
                                <>
                                  <ImageIcon className="h-4 w-4 mr-1" />
                                  Set as Profile
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleRemoveAttachment(attachment.id)}
                            disabled={isProcessing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="checklist" className="space-y-4">
            <h3 className="text-lg font-medium">Onboarding Checklist</h3>
            <div className="space-y-2">
              {checklistItems.length === 0 ? (
                <p className="text-sm text-gray-500">No checklist items available.</p>
              ) : (
                <div className="space-y-2">
                  {checklistItems.map((item) => {
                    const progress = checklistProgress.find((p) => p.itemId === item.id) || {
                      itemId: item.id,
                      completed: false,
                    }
                    const isCompleted = progress.completed || false

                    return (
                      <div key={item.id} className="flex items-start gap-3 p-3 border rounded-md">
                        <Button
                          variant={isCompleted ? "default" : "outline"}
                          size="sm"
                          className="h-6 w-6 p-0 rounded-full mt-1"
                          onClick={() => handleChecklistItemToggle(item.id, !isCompleted)}
                        >
                          {isCompleted && <Check className="h-3 w-3" />}
                        </Button>
                        <div className="flex-1">
                          <p className={`text-sm ${isCompleted ? "line-through text-gray-500" : ""}`}>{item.text}</p>

                          <div className="flex flex-wrap gap-4 mt-2">
                            {/* Scheduled Date - Only show if showScheduledDate is true */}
                            {item.showScheduledDate && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Scheduled:</span>
                                <Popover
                                  open={openPopoverId === `scheduled-${item.id}`}
                                  onOpenChange={(open) => {
                                    if (open) {
                                      setOpenPopoverId(`scheduled-${item.id}`)
                                    } else {
                                      setOpenPopoverId(null)
                                    }
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {progress.scheduledDate
                                        ? format(new Date(progress.scheduledDate), "MMM d, yyyy")
                                        : "Set date"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 z-50" align="start">
                                    <div className="calendar-wrapper" onClick={(e) => e.stopPropagation()}>
                                      <CalendarComponent
                                        mode="single"
                                        selected={progress.scheduledDate ? new Date(progress.scheduledDate) : undefined}
                                        onSelect={(date) => {
                                          handleScheduledDateChange(item.id, date || undefined)
                                        }}
                                        initialFocus
                                        className="pointer-events-auto"
                                      />
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}

                            {/* Completed Date - Only show if showCompletedDate is true */}
                            {item.showCompletedDate && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Completed:</span>
                                {progress.completedAt ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs">
                                      {format(new Date(progress.completedAt), "MMM d, yyyy")}
                                      {progress.completedBy ? ` by ${progress.completedBy}` : ""}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 rounded-full"
                                      onClick={() => handleCompletedDateChange(item.id, undefined)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Popover
                                    open={openPopoverId === `completed-${item.id}`}
                                    onOpenChange={(open) => {
                                      if (open) {
                                        setOpenPopoverId(`completed-${item.id}`)
                                      } else {
                                        setOpenPopoverId(null)
                                      }
                                    }}
                                  >
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        Set date
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 z-50" align="start">
                                      <div className="calendar-wrapper" onClick={(e) => e.stopPropagation()}>
                                        <CalendarComponent
                                          mode="single"
                                          selected={undefined}
                                          onSelect={(date) => {
                                            handleCompletedDateChange(item.id, date || undefined)
                                          }}
                                          initialFocus
                                          className="pointer-events-auto"
                                        />
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isProcessing}>
            {isProcessing ? "Processing..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
