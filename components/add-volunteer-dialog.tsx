"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { CardType } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface AddVolunteerDialogProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (volunteer: CardType) => void
}

export function AddVolunteerDialog({ isOpen, onClose, onAdd }: AddVolunteerDialogProps) {
  const [volunteer, setVolunteer] = useState<Partial<CardType>>({
    title: "",
    email: "",
    phone: "",
    description: "",
    tags: [],
    currentRoles: [],
  })

  const [newRole, setNewRole] = useState("")
  const [newTag, setNewTag] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setVolunteer((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const addRole = () => {
    if (newRole.trim() === "") return

    setVolunteer((prev) => ({
      ...prev,
      currentRoles: [...(prev.currentRoles || []), newRole.trim()],
    }))
    setNewRole("")
  }

  const removeRole = (roleToRemove: string) => {
    setVolunteer((prev) => ({
      ...prev,
      currentRoles: (prev.currentRoles || []).filter((role) => role !== roleToRemove),
    }))
  }

  const addTag = () => {
    if (newTag.trim() === "") return

    setVolunteer((prev) => ({
      ...prev,
      tags: [...(prev.tags || []), newTag.trim()],
    }))
    setNewTag("")
  }

  const removeTag = (tagToRemove: string) => {
    setVolunteer((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((tag) => tag !== tagToRemove),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newVolunteer: CardType = {
      id: Date.now().toString(),
      title: volunteer.title || "Unnamed Volunteer",
      email: volunteer.email || "",
      phone: volunteer.phone || "",
      description: volunteer.description || "",
      tags: volunteer.tags || [],
      currentRoles: volunteer.currentRoles || [],
      createdAt: new Date().toISOString(),
      attachments: [],
      data: {},
    }

    onAdd(newVolunteer)

    // Reset form
    setVolunteer({
      title: "",
      email: "",
      phone: "",
      description: "",
      tags: [],
      currentRoles: [],
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Volunteer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="title">Full Name *</Label>
            <Input
              id="title"
              name="title"
              value={volunteer.title || ""}
              onChange={handleChange}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={volunteer.email || ""}
                onChange={handleChange}
                placeholder="john.doe@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={volunteer.phone || ""}
                onChange={handleChange}
                placeholder="(123) 456-7890"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Current Role(s)</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(volunteer.currentRoles || []).map((role, index) => (
                <Badge key={index} className="flex items-center gap-1">
                  {role}
                  <button type="button" onClick={() => removeRole(role)} className="h-4 w-4 rounded-full">
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove role</span>
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="Add a role"
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault() && addRole()}
              />
              <Button type="button" onClick={addRole} size="sm">
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags (Optional)</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(volunteer.tags || []).map((tag, index) => (
                <Badge key={index} className="flex items-center gap-1">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="h-4 w-4 rounded-full">
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove tag</span>
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault() && addTag()}
              />
              <Button type="button" onClick={addTag} size="sm">
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Notes</Label>
            <Textarea
              id="description"
              name="description"
              value={volunteer.description || ""}
              onChange={handleChange}
              placeholder="Additional information about the volunteer"
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add Volunteer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
