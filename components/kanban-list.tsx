"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useDrop } from "react-dnd"
import { KanbanCard } from "@/components/kanban-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, MoreHorizontal, GripVertical, Filter, X, FileText } from "lucide-react"
import type { CardType, ListType } from "@/lib/types"
import { AddVolunteerDialog } from "@/components/add-volunteer-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  isAllVolunteersList?: boolean
  allLists?: ListType[]
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
  isAllVolunteersList = false,
  allLists = [],
}: KanbanListProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [listTitle, setListTitle] = useState(title)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [filterActive, setFilterActive] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedLists, setSelectedLists] = useState<string[]>([])
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

  // Extract all unique roles and tags from cards
  const allRoles = Array.from(new Set(cards.flatMap((card) => card.currentRoles || []).filter(Boolean))).sort()
  const allTags = Array.from(new Set(cards.flatMap((card) => card.tags || []).filter(Boolean))).sort()

  // Get all lists except the All Volunteers list for filtering
  const filterableLists = allLists.filter((list) => list.id !== id)

  // Filter cards based on selected roles, tags, and lists
  const filteredCards = cards.filter((card) => {
    if (!filterActive || (selectedRoles.length === 0 && selectedTags.length === 0 && selectedLists.length === 0)) {
      return true
    }

    const hasSelectedRole =
      selectedRoles.length === 0 ||
      (card.currentRoles && card.currentRoles.some((role) => selectedRoles.includes(role)))

    const hasSelectedTag =
      selectedTags.length === 0 || (card.tags && card.tags.some((tag) => selectedTags.includes(tag)))

    const isInSelectedList = selectedLists.length === 0 || selectedLists.includes(card.listId || "")

    return hasSelectedRole && hasSelectedTag && isInSelectedList
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

  const toggleRoleFilter = (role: string) => {
    setSelectedRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]))
    setFilterActive(true)
  }

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
    setFilterActive(true)
  }

  const toggleListFilter = (listId: string) => {
    setSelectedLists((prev) => (prev.includes(listId) ? prev.filter((l) => l !== listId) : [...prev, listId]))
    setFilterActive(true)
  }

  const clearFilters = () => {
    setSelectedRoles([])
    setSelectedTags([])
    setSelectedLists([])
    setFilterActive(false)
  }

  return (
    <div
      ref={drop}
      className={`flex-shrink-0 w-80 rounded-lg shadow ${isOver ? "bg-gray-100" : ""} ${
        isAllVolunteersList ? "bg-red-50" : "bg-white"
      }`}
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div
        className={`p-3 border-b border-gray-200 flex items-center justify-between rounded-t-lg ${
          isAllVolunteersList ? "bg-red-50" : "bg-white"
        }`}
      >
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
            <div className="flex items-center gap-2" onClick={handleTitleClick}>
              <h3 className="font-semibold text-gray-700 cursor-pointer">{title}</h3>
              <Badge variant="outline" className="text-xs py-0 px-1.5 h-5 bg-gray-100">
                {filteredCards.length}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 ${filterActive ? "bg-blue-50 text-blue-600" : ""}`}
              >
                <Filter className="h-4 w-4" />
                <span className="sr-only">Filter cards</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filter Cards</h4>
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                    Clear Filters
                  </Button>
                </div>

                <Tabs defaultValue="roles">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="roles">Roles</TabsTrigger>
                    <TabsTrigger value="tags">Tags</TabsTrigger>
                    {isAllVolunteersList && <TabsTrigger value="lists">Lists</TabsTrigger>}
                  </TabsList>

                  <TabsContent value="roles" className="mt-2">
                    {allRoles.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {allRoles.map((role) => (
                          <div key={role} className="flex items-center space-x-2">
                            <Checkbox
                              id={`role-${id}-${role}`}
                              checked={selectedRoles.includes(role)}
                              onCheckedChange={() => toggleRoleFilter(role)}
                            />
                            <Label htmlFor={`role-${id}-${role}`} className="text-sm cursor-pointer">
                              {role}
                            </Label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No roles available</p>
                    )}
                  </TabsContent>

                  <TabsContent value="tags" className="mt-2">
                    {allTags.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {allTags.map((tag) => (
                          <div key={tag} className="flex items-center space-x-2">
                            <Checkbox
                              id={`tag-${id}-${tag}`}
                              checked={selectedTags.includes(tag)}
                              onCheckedChange={() => toggleTagFilter(tag)}
                            />
                            <Label htmlFor={`tag-${id}-${tag}`} className="text-sm cursor-pointer">
                              {tag}
                            </Label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No tags available</p>
                    )}
                  </TabsContent>

                  {isAllVolunteersList && (
                    <TabsContent value="lists" className="mt-2">
                      {filterableLists.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {filterableLists.map((list) => (
                            <div key={list.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`list-${id}-${list.id}`}
                                checked={selectedLists.includes(list.id)}
                                onCheckedChange={() => toggleListFilter(list.id)}
                              />
                              <Label htmlFor={`list-${id}-${list.id}`} className="text-sm cursor-pointer">
                                {list.title}
                              </Label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No lists available</p>
                      )}
                    </TabsContent>
                  )}
                </Tabs>

                {filterActive && (selectedRoles.length > 0 || selectedTags.length > 0 || selectedLists.length > 0) && (
                  <div className="pt-2 border-t">
                    <h5 className="text-xs font-medium mb-2">Active Filters:</h5>
                    <div className="flex flex-wrap gap-1">
                      {selectedRoles.map((role) => (
                        <Badge key={role} variant="outline" className="flex items-center gap-1 text-xs py-0 px-1.5 h-5">
                          {role}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => toggleRoleFilter(role)} />
                        </Badge>
                      ))}
                      {selectedTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="flex items-center gap-1 text-xs py-0 px-1.5 h-5"
                        >
                          {tag}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => toggleTagFilter(tag)} />
                        </Badge>
                      ))}
                      {selectedLists.map((listId) => {
                        const listTitle = filterableLists.find((l) => l.id === listId)?.title || listId
                        return (
                          <Badge
                            key={listId}
                            variant="default"
                            className="flex items-center gap-1 text-xs py-0 px-1.5 h-5"
                          >
                            {listTitle}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => toggleListFilter(listId)} />
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

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
              {isAllVolunteersList && (
                <DropdownMenuItem
                  onClick={() => {
                    // Create a query string with the current filters
                    const params = new URLSearchParams()
                    params.append("listId", id)

                    // Add filter parameters
                    if (selectedRoles.length > 0) {
                      params.append("roles", selectedRoles.join(","))
                    }
                    if (selectedTags.length > 0) {
                      params.append("tags", selectedTags.join(","))
                    }
                    if (selectedLists.length > 0) {
                      params.append("lists", selectedLists.join(","))
                    }
                    params.append("filtered", filterActive ? "true" : "false")

                    window.location.href = `/report-generator?${params.toString()}`
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Create Report
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-red-600" onClick={onDelete}>
                Delete List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-2 overflow-y-auto flex-grow" style={{ maxHeight: "calc(100% - 50px)" }}>
        {filteredCards
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
        {filteredCards.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">
            {cards.length === 0 ? "No volunteers in this list" : "No volunteers match the current filters"}
          </div>
        )}
      </div>

      <AddVolunteerDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={handleAddVolunteer}
      />
    </div>
  )
}
