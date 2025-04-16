"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useDrop } from "react-dnd"
import { KanbanCard } from "@/components/kanban-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, MoreHorizontal, GripVertical } from "lucide-react"
import type { CardType } from "@/lib/types"
import { AddVolunteerDialog } from "@/components/add-volunteer-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface KanbanListProps {
  id: string
  title: string
  cards: CardType[]
  onTitleChange: (newTitle: string) => void
  onCardMove: (cardId: string, fromListId: string, toListId: string) => void
  onCardAdd: (card: CardType) => void
  onCardUpdate: (card: CardType) => void
  onCardDelete: (cardId: string) => void
  onDelete: () => void
  isDraggable?: boolean
}

export function KanbanList({
  id,
  title,
  cards,
  onTitleChange,
  onCardMove,
  onCardAdd,
  onCardUpdate,
  onCardDelete,
  onDelete,
  isDraggable = false,
}: KanbanListProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [listTitle, setListTitle] = useState(title)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [{ isOver }, drop] = useDrop({
    accept: "CARD",
    drop: (item: { id: string; listId: string }) => {
      if (item.listId !== id) {
        onCardMove(item.id, item.listId, id)
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  })

  const handleTitleClick = () => {
    setIsEditing(true)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
  }

  const handleTitleBlur = () => {
    setIsEditing(false)
    if (listTitle.trim() !== "") {
      onTitleChange(listTitle)
    } else {
      setListTitle(title)
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleBlur()
    }
  }

  const handleAddVolunteer = (volunteer: CardType) => {
    onCardAdd(volunteer)
    setIsAddDialogOpen(false)
  }

  return (
    <div
      ref={drop}
      className={`flex-shrink-0 w-80 bg-white rounded-lg shadow ${isOver ? "bg-gray-100" : ""}`}
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white rounded-t-lg">
        <div className="flex items-center flex-1">
          {isDraggable && (
            <div className="cursor-move p-1 mr-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
              <GripVertical className="h-5 w-5" />
            </div>
          )}

          {isEditing ? (
            <Input
              ref={inputRef}
              type="text"
              value={listTitle}
              onChange={(e) => setListTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="font-semibold"
            />
          ) : (
            <h3 className="font-semibold text-gray-700 cursor-pointer" onClick={handleTitleClick}>
              {title}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="sr-only">Add card</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleTitleClick}>Rename List</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" onClick={onDelete}>
                Delete List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-2 overflow-y-auto flex-grow" style={{ maxHeight: "calc(100% - 50px)" }}>
        {cards
          .filter(
            (card, index, self) =>
              // Filter out duplicates based on ID
              index === self.findIndex((c) => c.id === card.id),
          )
          .map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              listId={id}
              onUpdate={(updatedCard) => {
                console.log("Card updated in KanbanList:", updatedCard)
                onCardUpdate(updatedCard)
              }}
              onDelete={() => onCardDelete(card.id)}
            />
          ))}
        {cards.length === 0 && <div className="text-center py-4 text-gray-400 text-sm">No volunteers in this list</div>}
      </div>

      <AddVolunteerDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={handleAddVolunteer}
      />
    </div>
  )
}
