"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { DndProvider, useDrag, useDrop } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import { KanbanList } from "@/components/kanban-list"
import type { CardType, ListType } from "@/lib/types"
import { debugLog } from "@/lib/debug-utils"
import { autoSave, forceSave, loadAllData } from "@/lib/auto-save"

// Local storage keys
// const LISTS_STORAGE_KEY = "volunteerTrackerLists"
// const VOLUNTEERS_STORAGE_KEY = "testVolunteers"
const ALL_VOLUNTEERS_LIST_ID = "all-volunteers-list"

interface KanbanBoardProps {
  newListTitleState?: [string, React.Dispatch<React.SetStateAction<string>>]
}

// List item component with drag and drop
interface DraggableListProps {
  list: ListType
  index: number
  moveList: (dragIndex: number, hoverIndex: number) => void
  onTitleChange: (newTitle: string) => void
  onCardMove: (cardId: string, fromListId: string, toListId: string) => void
  onCardAdd: (card: CardType) => void
  onCardUpdate: (card: CardType) => void
  onCardDelete: (cardId: string) => void
  onDelete: () => void
  allLists: ListType[]
  isAllVolunteersList?: boolean
}

function DraggableList({
  list,
  index,
  moveList,
  onTitleChange,
  onCardMove,
  onCardAdd,
  onCardUpdate,
  onCardDelete,
  onDelete,
  allLists,
  isAllVolunteersList = false,
}: DraggableListProps) {
  const ref = useRef<HTMLDivElement>(null)

  const [{ isDragging }, drag] = useDrag({
    type: "LIST",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [, drop] = useDrop({
    accept: "LIST",
    hover: (draggedItem: { index: number }, monitor) => {
      if (!ref.current) return

      const dragIndex = draggedItem.index
      const hoverIndex = index

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) return

      moveList(dragIndex, hoverIndex)
      draggedItem.index = hoverIndex
    },
  })

  drag(drop(ref))

  return (
    <div ref={ref} className={`flex-shrink-0 ${isDragging ? "opacity-50" : "opacity-100"}`} style={{ width: "320px" }}>
      <KanbanList
        id={list.id}
        title={list.title}
        cards={list.cards}
        onTitleChange={onTitleChange}
        onCardMove={onCardMove}
        onCardAdd={(card) => onCardAdd(card)}
        onCardUpdate={onCardUpdate}
        onCardDelete={onCardDelete}
        onDelete={onDelete}
        isDraggable={true}
        isAllVolunteersList={isAllVolunteersList}
        allLists={allLists}
      />
    </div>
  )
}

export function KanbanBoard({ newListTitleState }: KanbanBoardProps) {
  const [lists, setLists] = useState<ListType[]>([])
  const [volunteers, setVolunteers] = useState<CardType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const listsInitialized = useRef(false)
  const boardRef = useRef<HTMLDivElement>(null)

  // Function to load data from localStorage
  const loadDataFromLocalStorage = () => {
    try {
      setIsLoading(true)

      const { lists: loadedListsData, volunteers: loadedVolunteers } = loadAllData()

      // Log information about volunteers with images for debugging
      const volunteersWithImages = loadedVolunteers.filter((v) => v.image).length
      debugLog(`Loaded ${volunteersWithImages} volunteers with images from localStorage`, {
        totalVolunteers: loadedVolunteers.length,
      })

      // Ensure all volunteers have the required properties
      const processedVolunteers = loadedVolunteers.map((volunteer) => {
        // Make sure attachments array exists
        if (!volunteer.attachments) volunteer.attachments = []

        // Make sure image property is preserved
        if (!volunteer.image && volunteer.attachments && volunteer.attachments.length > 0) {
          // Try to find an image in attachments if image property is missing
          const imageAttachment = volunteer.attachments.find(
            (att) => att.type?.startsWith("image/") || att.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i),
          )
          if (
            imageAttachment &&
            imageAttachment.url &&
            typeof imageAttachment.url === "string" &&
            imageAttachment.url.startsWith("data:")
          ) {
            volunteer.image = imageAttachment.url
            debugLog("Recovered image from attachments during load", {
              volunteerId: volunteer.id,
              volunteerName: volunteer.title,
            })
          }
        }

        // Validate image data
        if (volunteer.image && (typeof volunteer.image !== "string" || !volunteer.image.startsWith("data:"))) {
          debugLog(`Invalid image data for ${volunteer.title}, removing image property`, {
            volunteerId: volunteer.id,
          })
          volunteer.image = null
        }

        return volunteer
      })

      // Save the updated volunteers back to localStorage to ensure image properties are preserved
      autoSave({ volunteers: processedVolunteers }, true)

      setVolunteers(processedVolunteers)

      // Create full list objects with cards from volunteers
      const processedLists = loadedListsData.map((list: any) => {
        // Find all volunteers that belong to this list
        const listCards = processedVolunteers.filter((v) => v.listId === list.id)
        return {
          id: list.id,
          title: list.title,
          cards: listCards,
        }
      })

      // Assign unassigned volunteers to the first list if needed
      if (processedVolunteers.length > 0 && processedLists.length > 0) {
        let unassignedFound = false
        processedVolunteers.forEach((volunteer) => {
          if (!volunteer.listId) {
            volunteer.listId = processedLists[0].id
            unassignedFound = true
          }
        })

        // Update volunteers in localStorage if any were unassigned
        if (unassignedFound) {
          autoSave({ volunteers: processedVolunteers }, true)
        }
      }

      // Create the All Volunteers list immediately
      const allCards = processedVolunteers.map((volunteer) => ({ ...volunteer }))
      const allVolunteersList: ListType = {
        id: ALL_VOLUNTEERS_LIST_ID,
        title: "All Volunteers",
        cards: allCards,
      }

      // Add the All Volunteers list to the processed lists
      const finalLists = [...processedLists, allVolunteersList]

      // Clean up any duplicates that might exist in the loaded lists
      const cleanedLists = finalLists.map((list) => {
        const uniqueCards: CardType[] = []
        const cardIds = new Set<string>()

        list.cards.forEach((card) => {
          if (!cardIds.has(card.id)) {
            uniqueCards.push(card)
            cardIds.add(card.id)
          } else {
            debugLog("Removed duplicate card during load", { cardId: card.id, listId: list.id })
          }
        })

        return {
          ...list,
          cards: uniqueCards,
        }
      })

      setLists(cleanedLists)
      listsInitialized.current = true

      // Count volunteers with images for debugging
      const totalVolunteersWithImages = processedVolunteers.filter((v) => v.image).length
      debugLog(`Board loaded with ${totalVolunteersWithImages} volunteers having images`, {
        totalLists: cleanedLists.length,
        totalVolunteers: processedVolunteers.length,
      })
    } catch (error) {
      console.error("Error loading data from localStorage:", error)
      debugLog("Error loading board data", { error: String(error) })
    } finally {
      setIsLoading(false)
    }
  }

  // Load data from localStorage on mount
  useEffect(() => {
    loadDataFromLocalStorage()

    // Listen for addNewList event from parent component
    const handleAddNewList = (event: CustomEvent) => {
      const title = event.detail
      if (title) {
        addNewList(title)
      }
    }

    // Listen for dataForceSaved event
    const handleDataForceSaved = () => {
      debugLog("Received dataForceSaved event, reloading board data")
      loadDataFromLocalStorage()
    }

    window.addEventListener("addNewList", handleAddNewList as EventListener)
    window.addEventListener("dataForceSaved", handleDataForceSaved as EventListener)

    return () => {
      window.removeEventListener("addNewList", handleAddNewList as EventListener)
      window.removeEventListener("dataForceSaved", handleDataForceSaved as EventListener)
    }
  }, [])

  // Save lists to localStorage whenever they change
  useEffect(() => {
    if (!isLoading && listsInitialized.current) {
      try {
        // Extract all volunteers with their list IDs, ensuring no duplicates
        const allVolunteers: CardType[] = []
        const processedIds = new Set<string>()

        lists
          .filter((list) => list.id !== ALL_VOLUNTEERS_LIST_ID) // Don't include cards from All Volunteers list
          .forEach((list) => {
            if (list.cards && list.cards.length > 0) {
              list.cards.forEach((card) => {
                // Only add the card if we haven't processed its ID yet
                if (!processedIds.has(card.id)) {
                  // Ensure each card has the correct listId
                  allVolunteers.push({
                    ...card,
                    listId: list.id,
                  })
                  processedIds.add(card.id)
                } else {
                  debugLog("Prevented duplicate card from being saved", { cardId: card.id, listId: list.id })
                }
              })
            }
          })

        // Count volunteers with images for debugging
        const volunteersWithImages = allVolunteers.filter((v) => v.image).length
        debugLog("Auto-saving volunteers", {
          total: allVolunteers.length,
          withImages: volunteersWithImages,
        })

        // Use our auto-save utility to save the data
        autoSave({
          lists,
          volunteers: allVolunteers,
        })
      } catch (error) {
        console.error("Error saving data to localStorage:", error)
        debugLog("Error auto-saving data", { error: String(error) })
      }
    }
  }, [lists, isLoading])

  const addNewList = (title: string) => {
    if (title.trim() === "") return

    const newList: ListType = {
      id: Date.now().toString(),
      title: title.trim(),
      cards: [],
    }

    setLists((prevLists) => [...prevLists, newList])
    debugLog("Added new list", newList)

    // Scroll to the right after adding a new list
    setTimeout(() => {
      if (boardRef.current) {
        boardRef.current.scrollLeft = boardRef.current.scrollWidth
      }
    }, 100)
  }

  const updateListTitle = (listId: string, newTitle: string) => {
    setLists((prevLists) => prevLists.map((list) => (list.id === listId ? { ...list, title: newTitle } : list)))
  }

  const moveList = (dragIndex: number, hoverIndex: number) => {
    setLists((prevLists) => {
      const newLists = [...prevLists]
      const draggedList = newLists[dragIndex]
      newLists.splice(dragIndex, 1)
      newLists.splice(hoverIndex, 0, draggedList)
      return newLists
    })
  }

  const moveCard = (cardId: string, fromListId: string, toListId: string) => {
    // Don't allow dragging from the All Volunteers list
    if (fromListId === ALL_VOLUNTEERS_LIST_ID) {
      return
    }

    setLists((prevLists) => {
      // Find the source and destination lists
      const sourceListIndex = prevLists.findIndex((list) => list.id === fromListId)
      const destListIndex = prevLists.findIndex((list) => list.id === toListId)

      if (sourceListIndex === -1 || destListIndex === -1) return prevLists

      // Create a new array of lists
      const newLists = [...prevLists]

      // Find the card in the source list
      const cardIndex = newLists[sourceListIndex].cards.findIndex((card) => card.id === cardId)
      if (cardIndex === -1) return prevLists

      // Get the card and remove it from the source list
      const [movedCard] = newLists[sourceListIndex].cards.splice(cardIndex, 1)

      // Update the card's listId
      movedCard.listId = toListId

      // Check if the card already exists in the destination list to prevent duplicates
      const existingCardIndex = newLists[destListIndex].cards.findIndex((card) => card.id === cardId)
      if (existingCardIndex !== -1) {
        // Replace the existing card instead of adding a new one
        newLists[destListIndex].cards[existingCardIndex] = movedCard
      } else {
        // Add the card to the destination list
        newLists[destListIndex].cards.push(movedCard)
      }

      // Update the All Volunteers list if it exists
      const allVolunteersListIndex = newLists.findIndex((list) => list.id === ALL_VOLUNTEERS_LIST_ID)
      if (allVolunteersListIndex !== -1) {
        // Find the card in the All Volunteers list
        const allVolunteersCardIndex = newLists[allVolunteersListIndex].cards.findIndex((card) => card.id === cardId)
        if (allVolunteersCardIndex !== -1) {
          // Update the card in the All Volunteers list
          newLists[allVolunteersListIndex].cards[allVolunteersCardIndex] = {
            ...movedCard,
            listId: toListId,
          }
        }
      }

      // Log the operation for debugging
      debugLog("Moved card between lists", {
        cardId,
        fromListId,
        toListId,
        cardData: movedCard,
      })

      // Force an immediate save after moving a card
      setTimeout(() => {
        forceSave(
          newLists,
          newLists.filter((list) => list.id !== ALL_VOLUNTEERS_LIST_ID).flatMap((list) => list.cards),
        )
      }, 0)

      return newLists
    })
  }

  const addCard = (listId: string, card: CardType) => {
    // Add listId to the card
    const cardWithListId = { ...card, listId }

    setLists((prevLists) => {
      const newLists = [...prevLists]

      // Add to the specified list
      const listIndex = newLists.findIndex((list) => list.id === listId)
      if (listIndex !== -1) {
        newLists[listIndex].cards.push(cardWithListId)
      }

      // Add to the All Volunteers list if it exists
      const allVolunteersListIndex = newLists.findIndex((list) => list.id === ALL_VOLUNTEERS_LIST_ID)
      if (allVolunteersListIndex !== -1) {
        newLists[allVolunteersListIndex].cards.push(cardWithListId)
      }

      return newLists
    })

    // Also update the volunteers array
    setVolunteers((prevVolunteers) => [...prevVolunteers, cardWithListId])
  }

  const updateCard = (listId: string, updatedCard: CardType) => {
    // Ensure the card has the correct listId
    const cardWithListId = {
      ...updatedCard,
      listId,
    }

    debugLog("Updating card in KanbanBoard", {
      id: cardWithListId.id,
      name: cardWithListId.title,
      hasImage: !!cardWithListId.image,
      imageLength: cardWithListId.image ? cardWithListId.image.length : 0,
    })

    setLists((prevLists) => {
      const newLists = [...prevLists]

      // Update in all lists
      const updatedLists = newLists.map((list) => {
        // Find the card in this list
        const cardIndex = list.cards.findIndex((card) => card.id === updatedCard.id)

        // If found, update it
        if (cardIndex !== -1) {
          const updatedCards = [...list.cards]
          updatedCards[cardIndex] =
            list.id === listId
              ? cardWithListId
              : { ...cardWithListId, listId: list.id === ALL_VOLUNTEERS_LIST_ID ? listId : list.id }

          return {
            ...list,
            cards: updatedCards,
          }
        }

        return list
      })

      // Force an immediate save after updating a card
      setTimeout(() => {
        forceSave(
          updatedLists,
          updatedLists.filter((list) => list.id !== ALL_VOLUNTEERS_LIST_ID).flatMap((list) => list.cards),
        )
      }, 0)

      return updatedLists
    })

    // Also update the volunteers array
    setVolunteers((prevVolunteers) => {
      const updatedVolunteers = prevVolunteers.map((volunteer) =>
        volunteer.id === cardWithListId.id ? cardWithListId : volunteer,
      )
      return updatedVolunteers
    })
  }

  const deleteCard = (listId: string, cardId: string) => {
    setLists((prevLists) => {
      return prevLists.map((list) => {
        // Remove the card from all lists
        return {
          ...list,
          cards: list.cards.filter((card) => card.id !== cardId),
        }
      })
    })

    // Also update the volunteers array
    setVolunteers((prevVolunteers) => {
      return prevVolunteers.filter((volunteer) => volunteer.id !== cardId)
    })
  }

  const deleteList = (listId: string) => {
    // Don't allow deleting the All Volunteers list
    if (listId === ALL_VOLUNTEERS_LIST_ID) {
      alert("The All Volunteers list cannot be deleted.")
      return
    }

    // Find the list to be deleted
    const listToDelete = lists.find((list) => list.id === listId)
    if (!listToDelete) return

    // Ask for confirmation before deleting
    if (!window.confirm(`Are you sure you want to delete the list "${listToDelete.title}"?`)) {
      return
    }

    // Move any cards in this list to the first list (if there is one)
    setLists((prevLists) => {
      const newLists = [...prevLists]
      const listIndex = newLists.findIndex((list) => list.id === listId)

      if (listIndex === -1) return prevLists

      // If there are cards in this list and there's at least one other list
      if (newLists[listIndex].cards.length > 0 && newLists.length > 1) {
        // Find the first list that's not the one being deleted and not the All Volunteers list
        const firstListIndex = newLists.findIndex((list) => list.id !== listId && list.id !== ALL_VOLUNTEERS_LIST_ID)

        if (firstListIndex !== -1) {
          // Move all cards to the first list
          newLists[listIndex].cards.forEach((card) => {
            card.listId = newLists[firstListIndex].id
            newLists[firstListIndex].cards.push(card)
          })

          // Update the All Volunteers list if it exists
          const allVolunteersListIndex = newLists.findIndex((list) => list.id === ALL_VOLUNTEERS_LIST_ID)
          if (allVolunteersListIndex !== -1) {
            // Update the listId of all cards from the deleted list
            newLists[allVolunteersListIndex].cards = newLists[allVolunteersListIndex].cards.map((card) => {
              if (card.listId === listId) {
                return { ...card, listId: newLists[firstListIndex].id }
              }
              return card
            })
          }
        }
      }

      // Remove the list
      newLists.splice(listIndex, 1)

      debugLog("Deleted list", { listId, listTitle: listToDelete.title })
      return newLists
    })
  }

  // Create the All Volunteers list if it doesn't exist
  // useEffect(() => {
  //   if (!isLoading && listsInitialized.current) {
  //     setLists((prevLists) => {
  //       // Check if the All Volunteers list already exists
  //       const allVolunteersListExists = prevLists.some((list) => list.id === ALL_VOLUNTEERS_LIST_ID)

  //       if (!allVolunteersListExists) {
  //         // Collect all cards from all lists
  //         const allCards = prevLists.flatMap((list) => list.cards.map((card) => ({ ...card })))

  //         // Create the All Volunteers list
  //         const allVolunteersList: ListType = {
  //           id: ALL_VOLUNTEERS_LIST_ID,
  //           title: "All Volunteers",
  //           cards: allCards,
  //         }

  //         // Add it to the end of the lists
  //         return [...prevLists, allVolunteersList]
  //       }

  //       return prevLists
  //     })
  //   }
  // }, [isLoading])

  // Keep the All Volunteers list updated with all cards
  // useEffect(() => {
  //   if (!isLoading && listsInitialized.current) {
  //     setLists((prevLists) => {
  //       // Find the All Volunteers list
  //       const allVolunteersListIndex = prevLists.findIndex((list) => list.id === ALL_VOLUNTEERS_LIST_ID)

  //       if (allVolunteersListIndex !== -1) {
  //         // Collect all cards from all other lists
  //         const allCards = prevLists
  //           .filter((list) => list.id !== ALL_VOLUNTEERS_LIST_ID)
  //           .flatMap((list) => list.cards.map((card) => ({ ...card })))

  //         // Create a new array of lists
  //         const newLists = [...prevLists]

  //         // Update the All Volunteers list
  //         newLists[allVolunteersListIndex] = {
  //           ...newLists[allVolunteersListIndex],
  //           cards: allCards,
  //         }

  //         return newLists
  //       }

  //       return prevLists
  //     })
  //   }
  // }, [volunteers, isLoading])

  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Loading board...</div>
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full bg-blue-50/50 p-2 rounded-lg">
        <div
          ref={boardRef}
          className="flex gap-4 overflow-x-auto h-full pb-2"
          style={{
            paddingRight: "24px", // Add extra padding to ensure the last list is fully visible
          }}
        >
          {lists.map((list, index) => (
            <DraggableList
              key={list.id}
              list={list}
              index={index}
              moveList={moveList}
              onTitleChange={(newTitle) => updateListTitle(list.id, newTitle)}
              onCardMove={moveCard}
              onCardAdd={(card) => addCard(list.id, card)}
              onCardUpdate={(card) => updateCard(list.id, card)}
              onCardDelete={(cardId) => deleteCard(list.id, cardId)}
              onDelete={() => deleteList(list.id)}
              allLists={lists}
              isAllVolunteersList={list.id === ALL_VOLUNTEERS_LIST_ID}
            />
          ))}
          {/* Add an invisible spacer element to ensure the last list is fully visible when scrolled */}
          <div className="flex-shrink-0 w-6"></div>
        </div>
      </div>
    </DndProvider>
  )
}
