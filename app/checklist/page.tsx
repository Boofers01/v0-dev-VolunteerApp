"use client"

import React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Plus, Trash2, GripVertical, Save } from "lucide-react"
import Link from "next/link"
import type { ChecklistItem } from "@/lib/types"
import { DndProvider, useDrag, useDrop } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { getChecklistItems, saveChecklistItems } from "@/lib/checklist-service"
import { debugLog } from "@/lib/debug-utils"

export default function ChecklistPage() {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [newItemText, setNewItemText] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Load saved checklist items
    const loadChecklist = async () => {
      try {
        const items = await getChecklistItems()
        setChecklistItems(items)
        debugLog("Loaded checklist items", items)
      } catch (error) {
        console.error("Error loading checklist items:", error)
      }
    }

    loadChecklist()
  }, [])

  const addItem = () => {
    if (newItemText.trim() === "") return

    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      text: newItemText.trim(),
      order: checklistItems.length,
      showScheduledDate: true,
      showCompletedDate: true,
    }

    setChecklistItems([...checklistItems, newItem])
    setNewItemText("")
  }

  const updateItem = (id: string, updates: Partial<ChecklistItem>) => {
    setChecklistItems(checklistItems.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  const removeItem = (id: string) => {
    setChecklistItems(checklistItems.filter((item) => item.id !== id))
  }

  const moveItem = (dragIndex: number, hoverIndex: number) => {
    const dragItem = checklistItems[dragIndex]
    const newItems = [...checklistItems]
    newItems.splice(dragIndex, 1)
    newItems.splice(hoverIndex, 0, dragItem)

    // Update order property
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      order: index,
    }))

    setChecklistItems(updatedItems)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Save the checklist items
      await saveChecklistItems(checklistItems)
      debugLog("Saved checklist items", checklistItems)

      // Show success message
      alert("Checklist saved successfully! New items will be added to all volunteers.")
    } catch (error) {
      console.error("Failed to save checklist:", error)
      alert("Failed to save checklist. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <main className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Board
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-800">Master Volunteer Checklist</h1>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Checklist Items</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-6">
                This master checklist will be applied to all volunteer cards. Drag items to reorder them.
              </p>

              <div className="space-y-4 mb-6">
                {checklistItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">No checklist items yet. Add some below.</div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 bg-gray-100 p-3 border-b">
                      <div className="col-span-1"></div>
                      <div className="col-span-7 font-medium">Item</div>
                      <div className="col-span-2 font-medium text-center">Show Date Fields</div>
                      <div className="col-span-2 font-medium text-center">Actions</div>
                    </div>
                    {checklistItems.map((item, index) => (
                      <ChecklistItemRow
                        key={item.id}
                        item={item}
                        index={index}
                        updateItem={updateItem}
                        removeItem={removeItem}
                        moveItem={moveItem}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="new-item">New Checklist Item</Label>
                  <Input
                    id="new-item"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="Enter a new checklist item"
                    onKeyDown={(e) => e.key === "Enter" && addItem()}
                  />
                </div>
                <Button onClick={addItem} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Checklist"}
            </Button>
          </div>
        </div>
      </main>
    </DndProvider>
  )
}

interface ChecklistItemRowProps {
  item: ChecklistItem
  index: number
  updateItem: (id: string, updates: Partial<ChecklistItem>) => void
  removeItem: (id: string) => void
  moveItem: (dragIndex: number, hoverIndex: number) => void
}

function ChecklistItemRow({ item, index, updateItem, removeItem, moveItem }: ChecklistItemRowProps) {
  const ref = React.useRef<HTMLDivElement>(null)

  const [{ isDragging }, drag] = useDrag({
    type: "CHECKLIST_ITEM",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [, drop] = useDrop({
    accept: "CHECKLIST_ITEM",
    hover: (draggedItem: { index: number }, monitor) => {
      if (!ref.current) return

      const dragIndex = draggedItem.index
      const hoverIndex = index

      if (dragIndex === hoverIndex) return

      moveItem(dragIndex, hoverIndex)
      draggedItem.index = hoverIndex
    },
  })

  drag(drop(ref))

  return (
    <div
      ref={ref}
      className={`grid grid-cols-12 gap-2 p-3 border-b items-center ${isDragging ? "opacity-50 bg-gray-50" : ""}`}
    >
      <div className="col-span-1 cursor-move text-gray-400 flex justify-center">
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="col-span-7">
        <Input value={item.text} onChange={(e) => updateItem(item.id, { text: e.target.value })} />
      </div>

      <div className="col-span-2 flex justify-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <Label htmlFor={`scheduled-${item.id}`} className="text-xs">
            Scheduled
          </Label>
          <Checkbox
            id={`scheduled-${item.id}`}
            checked={item.showScheduledDate}
            onCheckedChange={(checked) => updateItem(item.id, { showScheduledDate: checked === true })}
          />
        </div>

        <div className="flex flex-col items-center gap-1">
          <Label htmlFor={`completed-${item.id}`} className="text-xs">
            Completed
          </Label>
          <Checkbox
            id={`completed-${item.id}`}
            checked={item.showCompletedDate}
            onCheckedChange={(checked) => updateItem(item.id, { showCompletedDate: checked === true })}
          />
        </div>
      </div>

      <div className="col-span-2 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeItem(item.id)}
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </div>
  )
}
