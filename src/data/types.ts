export type Operation = {
  id: string
  name: string
  kind: 'dropIn' | 'group' | 'closedGroup' | 'outreach'
}

export type ParticipantCounts = {
  women: number
  men: number
  other: number
}

export type ActivityPerson = {
  id: string
  memberId?: string
  name: string
  gender: keyof ParticipantCounts
  volunteer: boolean
  assisting: boolean
  producing: boolean
}

export type Member = {
  id: string
  name: string
  gender: keyof ParticipantCounts
  birthYear: number
  groupId: string
  consentType: 'guardian' | 'self' | 'written'
  consentStatus: 'given' | 'waiting' | 'declined'
  acceptsExcursion: boolean
  acceptsVehicle: boolean
  hasSwimmingAbility: boolean
  phone: string
  email: string
  note: string
  passId: string
  archived: boolean
}

export type ActivityDetails = {
  endDate: string
  planned: boolean
  excursion: boolean
  staff: string[]
  tags: string[]
  activityTypes: string[]
  people: ActivityPerson[]
  assisting: ParticipantCounts
  producing: ParticipantCounts
  ageGroups: Record<string, ParticipantCounts>
  planning: 'none' | 'advance' | 'today'
  responsibilities: { idea: boolean, planning: boolean, preparation: boolean, implementation: boolean, evaluation: boolean }
  producedHours: number
  producedActivity: string
  notes: string
  excursionDetails?: {
    planning: string
    riskAssessmentParticipants: string
    riskAssessmentResponsible: string
    risks: { risk: string, probability: number, consequence: number, action: string, responsible: string }[]
    staff: { name: string, responsibility: string }[]
  }
}

export type Activity = {
  id: string
  title: string
  operationId: string
  date: string
  startTime: string
  endTime: string
  participants: ParticipantCounts
  details?: ActivityDetails
}

export type NewActivity = Omit<Activity, 'id'>

export type Session = {
  email: string
  name: string
}

export interface ActivityRepository {
  getOperations(): Promise<Operation[]>
  getActivities(): Promise<Activity[]>
  createActivity(activity: NewActivity): Promise<Activity>
}
