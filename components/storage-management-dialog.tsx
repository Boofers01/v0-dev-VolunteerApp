"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle2, RefreshCw, Trash2, HardDrive, FileDown } from "lucide-react"
import { cleanupLocalStorage, getDataUrlSizeInKB } from "@/lib/image-utils"
import type { CardType } from "@/lib/types"

export function StorageManagementDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [status, setStatus] = useState<{ type: "success" | "error" | "info" | "warning" | null; message: string }>({
    type: null,
    message: "",
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [storageInfo, setStorageInfo] = useState<{
    totalSize: number
    usedSize: number
    usagePercentage: number
    volunteers: number
    volunteersWithImages: number
    totalImageSize: number
  }>({
    totalSize: 5 * 1024 * 1024, // 5MB default
    usedSize: 0,
    usagePercentage: 0,
    volunteers: 0,
    volunteersWithImages: 0,
    totalImageSize: 0,
  })
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([])
  const [volunteers, setVolunteers] = useState<CardType[]>([])

  useEffect(() => {
    if (isOpen) {
      analyzeStorage()
    }
  }, [isOpen])

  const analyzeStorage = () => {
    try {
      setIsProcessing(true)

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

      // Get volunteers
      const volunteersString = localStorage.getItem("testVolunteers")
      const volunteers = volunteersString ? JSON.parse(volunteersString) : []

      // Calculate image sizes
      const volunteersWithImages = volunteers.filter((v: CardType) => v.image).length
      let totalImageSize = 0

      volunteers.forEach((volunteer: CardType) => {
        if (volunteer.image) {
          totalImageSize += volunteer.image.length
        }

        if (volunteer.attachments) {
          volunteer.attachments.forEach((attachment) => {
            if (attachment.url) {
              totalImageSize += attachment.url.length
            }
          })
        }
      })

      // Most browsers have a 5MB limit
      const estimatedLimit = 5 * 1024 * 1024
      const usagePercentage = (totalSize / estimatedLimit) * 100

      setStorageInfo({
        totalSize: estimatedLimit,
        usedSize: totalSize,
        usagePercentage,
        volunteers: volunteers.length,
        volunteersWithImages,
        totalImageSize,
      })

      setVolunteers(volunteers)
      setSelectedVolunteers([])

      setStatus({
        type: "info",
        message: `Storage analysis complete. Using ${Math.round(usagePercentage)}% of available storage.`,
      })
    } catch (error) {
      console.error("Error analyzing storage:", error)
      setStatus({
        type: "error",
        message: "Error analyzing storage. See console for details.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const compressAllImages = async () => {
    try {
      setIsProcessing(true)
      setStatus({
        type: "info",
        message: "Compressing all images...",
      })

      const success = await cleanupLocalStorage()

      if (success) {
        setStatus({
          type: "success",
          message: "All images compressed successfully. Refreshing storage information...",
        })

        // Refresh the board
        window.dispatchEvent(new CustomEvent("dataForceSaved"))

        // Re-analyze storage
        setTimeout(() => {
          analyzeStorage()
        }, 500)
      } else {
        setStatus({
          type: "error",
          message: "Failed to compress images. Please try again.",
        })
      }
    } catch (error) {
      console.error("Error compressing images:", error)
      setStatus({
        type: "error",
        message: "Error compressing images. See console for details.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const removeSelectedImages = async () => {
    if (selectedVolunteers.length === 0) {
      setStatus({
        type: "warning",
        message: "No volunteers selected. Please select at least one volunteer.",
      })
      return
    }

    try {
      setIsProcessing(true)
      setStatus({
        type: "info",
        message: `Removing images from ${selectedVolunteers.length} volunteers...`,
      })

      // Get volunteers from localStorage
      const volunteersString = localStorage.getItem("testVolunteers")
      if (!volunteersString) {
        setStatus({
          type: "error",
          message: "No volunteers found in localStorage.",
        })
        setIsProcessing(false)
        return
      }

      const volunteers = JSON.parse(volunteersString)

      // Remove images from selected volunteers
      let removedCount = 0
      for (const volunteer of volunteers) {
        if (selectedVolunteers.includes(volunteer.id)) {
          if (volunteer.image) {
            volunteer.image = null
            removedCount++
          }
        }
      }

      // Save back to localStorage
      localStorage.setItem("testVolunteers", JSON.stringify(volunteers))

      // Refresh the board
      window.dispatchEvent(new CustomEvent("dataForceSaved"))

      setStatus({
        type: "success",
        message: `Successfully removed images from ${removedCount} volunteers. Refreshing storage information...`,
      })

      // Re-analyze storage
      setTimeout(() => {
        analyzeStorage()
      }, 500)
    } catch (error) {
      console.error("Error removing images:", error)
      setStatus({
        type: "error",
        message: "Error removing images. See console for details.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const aggressivelyCompressImages = async () => {
    try {
      setIsProcessing(true)
      setStatus({
        type: "info",
        message: "Aggressively compressing all images...",
      })

      // Get volunteers from localStorage
      const volunteersString = localStorage.getItem("testVolunteers")
      if (!volunteersString) {
        setStatus({
          type: "error",
          message: "No volunteers found in localStorage.",
        })
        setIsProcessing(false)
        return
      }

      const volunteers = JSON.parse(volunteersString)
      let compressedCount = 0
      let totalSavings = 0

      // Compress all images with more aggressive settings
      for (const volunteer of volunteers) {
        if (volunteer.image) {
          const originalSize = volunteer.image.length

          // Create a temporary image element
          const img = new Image()
          await new Promise((resolve) => {
            img.onload = resolve
            img.src = volunteer.image
          })

          // Create a canvas with reduced dimensions
          const canvas = document.createElement("canvas")
          // Reduce to 300px max dimension
          const maxDimension = 300
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
          ctx?.drawImage(img, 0, 0, width, height)

          // Use very low quality
          volunteer.image = canvas.toDataURL("image/jpeg", 0.3)

          const newSize = volunteer.image.length
          const savings = originalSize - newSize

          if (savings > 0) {
            compressedCount++
            totalSavings += savings
          }
        }
      }

      // Save back to localStorage
      localStorage.setItem("testVolunteers", JSON.stringify(volunteers))

      // Refresh the board
      window.dispatchEvent(new CustomEvent("dataForceSaved"))

      setStatus({
        type: "success",
        message: `Aggressively compressed ${compressedCount} images, saved ${Math.round(totalSavings / 1024)}KB. Refreshing...`,
      })

      // Re-analyze storage
      setTimeout(() => {
        analyzeStorage()
      }, 500)
    } catch (error) {
      console.error("Error compressing images:", error)
      setStatus({
        type: "error",
        message: "Error compressing images. See console for details.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const exportVolunteerData = () => {
    try {
      // Get volunteers from localStorage
      const volunteersString = localStorage.getItem("testVolunteers")
      if (!volunteersString) {
        setStatus({
          type: "error",
          message: "No volunteers found in localStorage.",
        })
        return
      }

      const volunteers = JSON.parse(volunteersString)

      // Create a CSV with volunteer data
      const headers = ["ID", "Name", "Email", "Phone", "Notes", "Tags", "Roles"]
      const rows = volunteers.map((v: CardType) => [
        v.id,
        v.title,
        v.email || "",
        v.phone || "",
        (v.description || "").replace(/\n/g, " "),
        (v.tags || []).join("; "),
        (v.currentRoles || []).join("; "),
      ])

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n")

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `volunteers-export-${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setStatus({
        type: "success",
        message: "Volunteer data exported successfully (without images).",
      })
    } catch (error) {
      console.error("Error exporting volunteer data:", error)
      setStatus({
        type: "error",
        message: "Error exporting volunteer data. See console for details.",
      })
    }
  }

  const toggleSelectVolunteer = (volunteerId: string) => {
    setSelectedVolunteers((prev) => {
      if (prev.includes(volunteerId)) {
        return prev.filter((id) => id !== volunteerId)
      } else {
        return [...prev, volunteerId]
      }
    })
  }

  const selectAllVolunteers = () => {
    const volunteersWithImages = volunteers.filter((v) => v.image).map((v) => v.id)
    setSelectedVolunteers(volunteersWithImages)
  }

  const deselectAllVolunteers = () => {
    setSelectedVolunteers([])
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Management
          </DialogTitle>
          <DialogDescription>Manage your storage usage to ensure your data is saved properly.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="overview">Storage Overview</TabsTrigger>
            <TabsTrigger value="manage">Manage Images</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Storage Usage Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Storage Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      Used: {Math.round(storageInfo.usedSize / 1024)}KB of {Math.round(storageInfo.totalSize / 1024)}KB
                    </span>
                    <span>{Math.round(storageInfo.usagePercentage)}%</span>
                  </div>
                  <Progress value={storageInfo.usagePercentage} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total Volunteers</p>
                    <p className="font-medium">{storageInfo.volunteers}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Volunteers with Images</p>
                    <p className="font-medium">{storageInfo.volunteersWithImages}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Image Size</p>
                    <p className="font-medium">{Math.round(storageInfo.totalImageSize / 1024)}KB</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Average Image Size</p>
                    <p className="font-medium">
                      {storageInfo.volunteersWithImages > 0
                        ? `${Math.round(storageInfo.totalImageSize / storageInfo.volunteersWithImages / 1024)}KB`
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <Alert className={storageInfo.usagePercentage > 90 ? "bg-red-50 border-red-200" : ""}>
                  <AlertDescription className="text-sm">
                    {storageInfo.usagePercentage > 90 ? (
                      <span className="text-red-600">
                        <AlertCircle className="h-4 w-4 inline mr-1" />
                        Your storage is nearly full. Consider removing some images or exporting your data.
                      </span>
                    ) : (
                      <span>
                        Browser localStorage is limited to about 5MB per domain. This is a browser limitation that
                        cannot be increased.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={analyzeStorage} disabled={isProcessing} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button onClick={compressAllImages} disabled={isProcessing} variant="outline" size="sm">
                    Compress All Images
                  </Button>
                  <Button onClick={aggressivelyCompressImages} disabled={isProcessing} variant="outline" size="sm">
                    Aggressive Compression
                  </Button>
                  <Button onClick={exportVolunteerData} disabled={isProcessing} variant="outline" size="sm">
                    <FileDown className="h-4 w-4 mr-2" />
                    Export Data (No Images)
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Storage Management Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>
                      Use the <strong>Aggressive Compression</strong> option to drastically reduce image sizes (but with
                      lower quality)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Remove profile images from volunteers you don't need them for</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Export your data regularly as a backup</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Consider using smaller images (under 100KB each) for better storage efficiency</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            {/* Volunteer Image Management */}
            <Card>
              <CardHeader>
                <CardTitle>Manage Volunteer Images</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between mb-2">
                  <div className="space-x-2">
                    <Button onClick={selectAllVolunteers} variant="outline" size="sm">
                      Select All
                    </Button>
                    <Button onClick={deselectAllVolunteers} variant="outline" size="sm">
                      Deselect All
                    </Button>
                  </div>
                  <Button
                    onClick={removeSelectedImages}
                    disabled={isProcessing || selectedVolunteers.length === 0}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Selected Images
                  </Button>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 bg-gray-100 p-3 border-b">
                    <div className="col-span-1"></div>
                    <div className="col-span-5 font-medium">Volunteer</div>
                    <div className="col-span-3 font-medium">Image Size</div>
                    <div className="col-span-3 font-medium">Attachments</div>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto">
                    {volunteers
                      .filter((v) => v.image)
                      .map((volunteer) => (
                        <div key={volunteer.id} className="grid grid-cols-12 gap-2 p-3 border-b items-center">
                          <div className="col-span-1">
                            <Checkbox
                              checked={selectedVolunteers.includes(volunteer.id)}
                              onCheckedChange={() => toggleSelectVolunteer(volunteer.id)}
                              id={`volunteer-${volunteer.id}`}
                            />
                          </div>
                          <div className="col-span-5">
                            <Label htmlFor={`volunteer-${volunteer.id}`} className="cursor-pointer">
                              {volunteer.title}
                            </Label>
                          </div>
                          <div className="col-span-3">
                            {volunteer.image ? `${getDataUrlSizeInKB(volunteer.image)}KB` : "No image"}
                          </div>
                          <div className="col-span-3">
                            {volunteer.attachments ? volunteer.attachments.length : 0} attachments
                          </div>
                        </div>
                      ))}

                    {volunteers.filter((v) => v.image).length === 0 && (
                      <div className="p-4 text-center text-gray-500">No volunteers with images found.</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
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
  )
}
