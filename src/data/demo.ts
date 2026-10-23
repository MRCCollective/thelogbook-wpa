import type { Activity, ActivityRepository, Member, NewActivity, Operation, Session } from './types'

const activitiesKey = 'thelogbook-demo-activities-v1'
const sessionKey = 'thelogbook-demo-session-v1'
const membersKey = 'thelogbook-demo-members-v1'
const consentKey = 'thelogbook-demo-consent-enabled-v1'

const sampleMembers: Member[] = [
  { id: 'member-1', name: 'Alex Andersson', gender: 'other', birthYear: 2009, groupId: 'closed-group', consentType: 'guardian', consentStatus: 'given', acceptsExcursion: true, acceptsVehicle: true, hasSwimmingAbility: true, phone: '0700000001', email: 'alex@example.test', note: '', passId: 'A1B2C3D4Ep', archived: false },
  { id: 'member-2', name: 'Maja Nilsson', gender: 'women', birthYear: 2010, groupId: 'closed-group', consentType: 'guardian', consentStatus: 'given', acceptsExcursion: true, acceptsVehicle: false, hasSwimmingAbility: false, phone: '0700000002', email: 'maja@example.test', note: 'Får inte åka bil.', passId: 'F5G6H7J8Kp', archived: false },
  { id: 'member-3', name: 'Sam Berg', gender: 'men', birthYear: 2008, groupId: 'closed-group', consentType: 'self', consentStatus: 'waiting', acceptsExcursion: false, acceptsVehicle: false, hasSwimmingAbility: false, phone: '', email: 'sam@example.test', note: '', passId: 'L9M1N2P3Qp', archived: false },
  { id: 'member-4', name: 'Noor Hassan', gender: 'women', birthYear: 2009, groupId: 'closed-group', consentType: 'written', consentStatus: 'declined', acceptsExcursion: false, acceptsVehicle: false, hasSwimmingAbility: false, phone: '', email: '', note: '', passId: 'R4S5T6U7Vp', archived: false },
]

export function getConsentEnabled(): boolean {
  try { return localStorage.getItem(consentKey) !== 'false' } catch { return true }
}

export function setConsentEnabled(value: boolean): void {
  try { localStorage.setItem(consentKey, String(value)) } catch { /* Current session still updates. */ }
}

export function getMembers(): Member[] {
  try {
    const stored = localStorage.getItem(membersKey)
    if (stored) return JSON.parse(stored) as Member[]
  } catch { /* Fall back to fictional demo members. */ }
  return sampleMembers
}

export function saveMembers(members: Member[]): void {
  try { localStorage.setItem(membersKey, JSON.stringify(members)) } catch { /* Current session still updates. */ }
}

const operations: Operation[] = [
  { id: 'drop-in', name: 'Öppen verksamhet', kind: 'dropIn' },
  { id: 'youth-group', name: 'Ungdomsgruppen', kind: 'group' },
  { id: 'closed-group', name: 'Sluten grupp', kind: 'closedGroup' },
  { id: 'outreach', name: 'Uppsökande arbete', kind: 'outreach' },
]

function localDate(offset: number): string {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function seedActivities(): Activity[] {
  return [
    { id: 'demo-1', title: 'Eftermiddag på gården', operationId: 'drop-in', date: localDate(-2), startTime: '15:00', endTime: '18:00', participants: { women: 8, men: 10, other: 1 } },
    { id: 'demo-2', title: 'Musikverkstad', operationId: 'youth-group', date: localDate(-1), startTime: '16:30', endTime: '18:30', participants: { women: 5, men: 4, other: 0 } },
    { id: 'demo-3', title: 'Öppen verksamhet', operationId: 'drop-in', date: localDate(0), startTime: '14:00', endTime: '18:00', participants: { women: 7, men: 9, other: 1 } },
    { id: 'demo-4', title: 'Kvällspromenad', operationId: 'outreach', date: localDate(0), startTime: '19:00', endTime: '21:00', participants: { women: 3, men: 5, other: 0 } },
    { id: 'demo-5', title: 'Spelkväll', operationId: 'youth-group', date: localDate(2), startTime: '17:00', endTime: '20:00', participants: { women: 6, men: 7, other: 0 } },
    { id: 'demo-6', title: 'Öppen verksamhet', operationId: 'drop-in', date: localDate(4), startTime: '14:00', endTime: '18:00', participants: { women: 0, men: 0, other: 0 } },
    { id: 'demo-7', title: 'Skapande verkstad', operationId: 'youth-group', date: localDate(7), startTime: '16:00', endTime: '18:00', participants: { women: 0, men: 0, other: 0 } },
  ]
}

function readActivities(): Activity[] {
  try {
    const stored = localStorage.getItem(activitiesKey)
    if (stored) return JSON.parse(stored) as Activity[]
  } catch {
    // The demo remains usable if local storage is unavailable.
  }
  return seedActivities()
}

function saveActivities(activities: Activity[]): void {
  try {
    localStorage.setItem(activitiesKey, JSON.stringify(activities))
  } catch {
    // The current session still shows the newly created activity.
  }
}

export const demoRepository: ActivityRepository = {
  async getOperations() {
    return operations
  },
  async getActivities() {
    return readActivities()
  },
  async createActivity(input: NewActivity) {
    const activity: Activity = { ...input, id: crypto.randomUUID() }
    saveActivities([...readActivities(), activity])
    return activity
  },
}

export function getDemoSession(): Session | null {
  try {
    const stored = localStorage.getItem(sessionKey)
    return stored ? JSON.parse(stored) as Session : null
  } catch {
    return null
  }
}

export function signInToDemo(email: string): Session {
  const session = { email, name: 'Sofia' }
  try {
    localStorage.setItem(sessionKey, JSON.stringify(session))
  } catch {
    // Demo sign-in also works without persistence.
  }
  return session
}

export function signOutOfDemo(): void {
  try {
    localStorage.removeItem(sessionKey)
  } catch {
    // Session state is also cleared in React.
  }
}
