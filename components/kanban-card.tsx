"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useDrag } from "react-dnd"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { VolunteerDetailsDialog } from "@/components/volunteer-details-dialog"
import type { CardType } from "@/lib/types"
import { debugLog } from "@/lib/debug-utils"

interface KanbanCardProps {
  card: CardType
  listId: string
  onUpdate: (updatedCard: CardType) => void
  onDelete: () => void
}

export function KanbanCard({ card, listId, onUpdate, onDelete }: KanbanCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Check if this card is in the All Volunteers list
  const isInAllVolunteersList = listId === "all-volunteers-list"

  const [{ isDragging }, drag] = useDrag({
    type: "CARD",
    item: { id: card.id, listId },
    canDrag: !isInAllVolunteersList, // Prevent dragging from All Volunteers list
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  // Get initials for avatar fallback
  const getInitials = () => {
    const nameParts = card.title.split(" ")
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    }
    return nameParts[0].substring(0, 2).toUpperCase()
  }

  // Get profile image - either from card.image or from attachments
  useEffect(() => {
    const getProfileImage = () => {
      // Reset error state when trying to get a new image
      setImageError(false)

      // First check if there's a direct image property
      if (card.image && typeof card.image === "string" && card.image.startsWith("data:")) {
        debugLog(`Card ${card.id} (${card.title}) has direct image property`, {
          imageLength: card.image.length,
        })
        return card.image
      }

      // Then check attachments for an image
      if (card.attachments && card.attachments.length > 0) {
        const imageAttachment = card.attachments.find(
          (att) => att.type?.startsWith("image/") || att.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i),
        )
        if (
          imageAttachment &&
          imageAttachment.url &&
          typeof imageAttachment.url === "string" &&
          imageAttachment.url.startsWith("data:")
        ) {
          debugLog(`Card ${card.id} (${card.title}) found image in attachments`, {
            attachmentId: imageAttachment.id,
            attachmentName: imageAttachment.name,
          })
          return imageAttachment.url
        }
      }

      return null
    }

    const image = getProfileImage()
    setProfileImage(image)

    // If we found an image in attachments but card.image is not set, update the card
    if (!card.image && image && card.attachments) {
      const updatedCard = { ...card, image }
      debugLog(`Automatically setting image for ${card.title} from attachments`, {
        cardId: card.id,
      })

      // Update in localStorage
      try {
        const storedVolunteers = localStorage.getItem("testVolunteers")
        if (storedVolunteers) {
          const volunteers = JSON.parse(storedVolunteers) as CardType[]
          const updatedVolunteers = volunteers.map((v) => (v.id === updatedCard.id ? updatedCard : v))
          localStorage.setItem("testVolunteers", JSON.stringify(updatedVolunteers))

          // Log success
          debugLog(`Updated localStorage with recovered image for ${card.title}`, {
            cardId: card.id,
            imageLength: image.length,
          })
        }
      } catch (error) {
        console.error("Error updating localStorage:", error)
      }

      // Update in parent component
      onUpdate(updatedCard)
    }
  }, [card, onUpdate])

  const handleUpdateCard = (updatedCard: CardType) => {
    debugLog("KanbanCard.handleUpdateCard called with", {
      id: updatedCard.id,
      name: updatedCard.title,
      hasImage: !!updatedCard.image,
      imageLength: updatedCard.image ? updatedCard.image.length : 0,
    })

    // Ensure we update localStorage directly as well
    try {
      const storedVolunteers = localStorage.getItem("testVolunteers")
      if (storedVolunteers) {
        const volunteers = JSON.parse(storedVolunteers) as CardType[]
        const updatedVolunteers = volunteers.map((v) => (v.id === updatedCard.id ? updatedCard : v))
        localStorage.setItem("testVolunteers", JSON.stringify(updatedVolunteers))
        debugLog("KanbanCard directly updated localStorage with volunteer", {
          id: updatedCard.id,
          name: updatedCard.title,
          hasImage: !!updatedCard.image,
          imageLength: updatedCard.image ? updatedCard.image.length : 0,
        })
      }
    } catch (error) {
      console.error("Error updating localStorage:", error)
    }

    onUpdate(updatedCard)
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open details if clicking on the dropdown menu
    if ((e.target as HTMLElement).closest(".dropdown-trigger")) {
      return
    }
    setIsDetailsOpen(true)
  }

  const handleImageError = () => {
    console.error(`Error loading image for ${card.title}`)
    setImageError(true)

    // Try to recover from attachments
    if (card.attachments && card.attachments.length > 0) {
      const imageAttachment = card.attachments.find(
        (att) => att.type?.startsWith("image/") || att.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i),
      )

      if (imageAttachment && imageAttachment.url && imageAttachment.url !== card.image) {
        debugLog(`Attempting to recover image for ${card.title} after load error`, {
          cardId: card.id,
          attachmentId: imageAttachment.id,
        })

        setProfileImage(imageAttachment.url)

        // Update the card with the new image
        const updatedCard = { ...card, image: imageAttachment.url }
        handleUpdateCard(updatedCard)
      } else {
        setProfileImage(null)
      }
    } else {
      setProfileImage(null)
    }
  }

  return (
    <div
      ref={(node) => {
        drag(node)
        if (cardRef.current) {
          cardRef.current = node
        }
      }}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className={`mb-2 ${isInAllVolunteersList ? "" : "cursor-grab"}`}
    >
      <Card className="border border-gray-200 shadow-sm hover:shadow" onClick={handleCardClick}>
        <CardContent className="p-4">
          {/* Rectangular profile image */}
          <div className="w-full h-32 mb-3 relative overflow-hidden rounded-md border border-gray-200 bg-gray-50">
            {profileImage && !imageError ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <img
                  src={profileImage || "/placeholder.svg"}
                  alt={card.title}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-xl font-semibold">
                {getInitials()}
              </div>
            )}
          </div>

          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-medium text-gray-900 line-clamp-1">{card.title}</h4>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 dropdown-trigger"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsDetailsOpen(true)}>View Details</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Show all roles - with smaller text */}
          {card.currentRoles && card.currentRoles.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1">Roles:</p>
              <div className="flex flex-wrap gap-1">
                {card.currentRoles.map((role, i) => (
                  <Badge key={i} variant="outline" className="text-xs text-xs py-0 px-1.5 h-5 bg-gray-100">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Show all tags - with smaller text */}
          {card.tags && card.tags.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1">Tags:</p>
              <div className="flex flex-wrap gap-1">
                {card.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs py-0 px-1.5 h-5">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Show list name for cards in the All Volunteers list */}
          {isInAllVolunteersList && card.listId && (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1">List:</p>
              <Badge variant="default" className="text-xs py-0 px-1.5 h-5">
                {card.listId}
              </Badge>
            </div>
          )}

          {card.attachments && card.attachments.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500">
                {card.attachments.length} attachment{card.attachments.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <VolunteerDetailsDialog
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        volunteer={card}
        onUpdate={handleUpdateCard}
      />
    </div>
  )
}
