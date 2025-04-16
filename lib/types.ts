export interface CardType {
  id: string
  title: string
  description?: string
  email?: string
  phone?: string
  image?: string | null
  tags?: string[]
  createdAt: string
  checklistProgress?: ChecklistProgress[]
  attachments?: Attachment[]
  listId?: string // Store which list the card belongs to
  currentRoles?: string[] // Add current roles field
  data: any
}

export interface ListType {
  id: string
  title: string
  cards: CardType[]
}

export interface VolunteerData {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  image?: string
  notes?: string
  tags?: string[]
  // Add fields specific to your form
  volunteerRoles?: string[] | string
  dateOfBirth?: string
  preferredContactMethod?: string
  // Any other fields from your form
  [key: string]: any
}

// Update the ChecklistItem interface to include date field toggles
export interface ChecklistItem {
  id: string
  text: string
  order: number
  showScheduledDate: boolean
  showCompletedDate: boolean
}

// Update the ChecklistProgress interface to include scheduled and completed dates
export interface ChecklistProgress {
  itemId: string
  completed: boolean
  completedAt?: string
  completedBy?: string
  scheduledDate?: string
}

export interface Attachment {
  id: string
  name: string
  type: string
  url: string
  uploadedAt: string
}

export interface Volunteer extends CardType {}
