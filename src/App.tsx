import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ArrowRight, CalendarDays, Camera, Check, ChevronLeft, ChevronRight, Clock3,
  LayoutGrid, List, LogOut, Monitor, Moon, Plus, Settings, Sun, Users, ContactRound,
} from 'lucide-react'
import { demoRepository, getConsentEnabled, getDemoSession, getMembers, saveMembers, setConsentEnabled, signInToDemo, signOutOfDemo } from './data/demo'
import ActivityWizard from './ActivityWizard'
import ActivityDetails from './ActivityDetails'
import CheckInScanner from './CheckInScanner'
import ConsentList from './ConsentList'
import type { Activity, Member, NewActivity, Operation, Session } from './data/types'

type View = 'home' | 'activities' | 'calendar' | 'members' | 'settings'
type Theme = 'system' | 'dark' | 'light'

const themeKey = 'thelogbook-theme'

function savedTheme(): Theme {
  try {
    const saved = localStorage.getItem(themeKey)
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'light'
  } catch {
    return 'light'
  }
}

function deviceTheme(): 'dark' | 'light' {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const dateFormatter = new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'long' })
const fullDateFormatter = new Intl.DateTimeFormat('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })
const weekdayFormatter = new Intl.DateTimeFormat('sv-SE', { weekday: 'short' })
const monthFormatter = new Intl.DateTimeFormat('sv-SE', { month: 'long', year: 'numeric' })

function toISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function fromISO(value: string): Date {
  return new Date(`${value}T12:00:00`)
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function mondayOf(date: Date): Date {
  return addDays(date, -((date.getDay() + 6) % 7))
}

function totalParticipants(activity: Activity): number {
  return activity.participants.women + activity.participants.men + activity.participants.other + (activity.details?.people.length ?? 0)
}

function activitySort(first: Activity, second: Activity): number {
  return `${first.date}T${first.startTime}`.localeCompare(`${second.date}T${second.startTime}`)
}

function Brand() {
  return <div className="brand"><img className="brand-logo" src={`${import.meta.env.BASE_URL}thelogbook-logo.svg`} alt="The Logbook" width="199" height="47" /></div>
}

function AccountMenu({ variant, name, email, onSettings, onLogout }: {
  variant: 'top' | 'sidebar'
  name: string
  email: string
  onSettings: () => void
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function closeOutside(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return <div className={`account-menu account-menu-${variant}`} ref={menuRef}>
    {variant === 'sidebar'
      ? <button ref={triggerRef} className="account-button" type="button" aria-label="Öppna kontomeny" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(value => !value)}><span className="avatar">{name.charAt(0)}</span><span><strong>{name}</strong><small>{email}</small></span><Settings size={18} aria-hidden="true" /></button>
      : <button ref={triggerRef} className="avatar top-avatar" type="button" aria-label="Öppna kontomeny" title="Konto" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(value => !value)}>{name.charAt(0)}</button>}
    {open && <div className="account-menu-panel">
      <div className="account-menu-identity"><strong>{name}</strong><small>{email}</small></div>
      <button type="button" onClick={() => { setOpen(false); onSettings() }}><Settings size={17} /> Inställningar</button>
      <button type="button" onClick={() => { setOpen(false); onLogout() }}><LogOut size={17} /> Logga ut</button>
    </div>}
  </div>
}

function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [email, setEmail] = useState('demo@thelogbook.se')
  const [password, setPassword] = useState('demo123')
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (email.trim().toLowerCase() !== 'demo@thelogbook.se' || password !== 'demo123') {
      setError('Använd demokontot som visas nedan.')
      return
    }
    onLogin(signInToDemo(email.trim()))
  }

  return <main className="login-page">
    <div className="login-frame">
      <div className="login-story">
        <Brand />
        <div className="login-story-copy">
          <h1>Mer tid för<br /><em>det som händer.</em></h1>
          <p>Aktiviteterna, människorna och dagarna – samlade i ett enklare Logbook.</p>
        </div>
        <div className="login-illustration" aria-hidden="true">
          <div className="illustration-date">{new Intl.DateTimeFormat('sv-SE', { weekday: 'long' }).format(new Date())} <strong>{new Date().getDate()}</strong></div>
          <div className="illustration-line"><span>14:00</span><b>Öppen verksamhet</b><i /></div>
          <div className="illustration-line"><span>19:00</span><b>Kvällspromenad</b><i /></div>
        </div>
        <p className="login-story-footer">Ett nytt sätt att arbeta i The Logbook.</p>
      </div>
      <div className="login-panel">
        <div className="login-card">
          <h2>Välkommen tillbaka</h2>
          <p className="login-intro">Logga in och se hur det kan kännas att skapa och följa aktiviteter på mobilen. Detta är en interaktiv demo.</p>
          <form onSubmit={submit}>
            <label htmlFor="email">E-postadress</label>
            <input id="email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="off" required />
            <label htmlFor="password">Lösenord</label>
            <input id="password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" required />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary login-submit" type="submit">Logga in <ArrowRight size={19} /></button>
          </form>
          <div className="demo-credentials"><strong>Testkonto</strong><span>demo@thelogbook.se · demo123</span></div>
          <p className="login-disclaimer">Det här är en prototyp. Inloggningen är simulerad och använder inga riktiga konton.</p>
        </div>
      </div>
    </div>
  </main>
}

function ActivityList({ activities, operations, emptyText, onSelect }: { activities: Activity[], operations: Operation[], emptyText: string, onSelect: (activity: Activity) => void }) {
  if (!activities.length) return <div className="empty-state"><CalendarDays size={30} /><h3>Inga aktiviteter här än</h3><p>{emptyText}</p></div>

  let previousDate = ''
  return <div className="activity-list">
    {[...activities].sort(activitySort).map(activity => {
      const showDate = activity.date !== previousDate
      previousDate = activity.date
      const operation = operations.find(item => item.id === activity.operationId)
      const date = fromISO(activity.date)
      return <div key={activity.id}>
        {showDate && <h3 className="activity-date-heading">{fullDateFormatter.format(date)}{activity.date === toISO(new Date()) && <span>Idag</span>}</h3>}
        <button className="activity-row" type="button" onClick={() => onSelect(activity)} aria-label={`Visa ${activity.title || operation?.name || 'aktivitet'} den ${fullDateFormatter.format(date)}`}>
          <div className="activity-time">{activity.startTime}<span>{activity.endTime}</span></div>
          <div className={`activity-symbol ${operation?.kind ?? 'group'}`} aria-hidden="true"><span /></div>
          <div className="activity-copy"><h4>{activity.title || operation?.name || 'Aktivitet'}</h4><p>{activity.title ? operation?.name ?? 'Verksamhet' : 'Utan eget namn'}</p></div>
          <div className="activity-count" title="Antal deltagare"><Users size={16} /><span>{totalParticipants(activity) || '—'}</span></div>
          <ChevronRight className="activity-chevron" size={18} aria-hidden="true" />
        </button>
      </div>
    })}
  </div>
}

function CalendarView({ activities, operations, onAdd, onSelect }: { activities: Activity[], operations: Operation[], onAdd: () => void, onSelect: (activity: Activity) => void }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selected, setSelected] = useState(toISO(new Date()))
  const first = mondayOf(month)
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const weeks = Math.ceil(((month.getDay() + 6) % 7 + lastDay.getDate()) / 7)
  const days = Array.from({ length: weeks * 7 }, (_, index) => addDays(first, index))
  const byDate = useMemo(() => new Map(days.map(day => [toISO(day), activities.filter(activity => activity.date === toISO(day))])), [activities, month])
  const selectedActivities = activities.filter(activity => activity.date === selected)

  function moveMonth(amount: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + amount, 1)
    setMonth(next)
    setSelected(toISO(next))
  }

  return <div className="calendar-page">
    <div className="page-heading"><div><h1>Kalender</h1><p>Se vad som har hänt och vad som är på gång.</p></div><button className="button button-primary desktop-add" onClick={onAdd}><Plus size={19} /> Ny aktivitet</button></div>
    <div className="calendar-layout"><section className="calendar-card"><div className="calendar-header"><h2>{monthFormatter.format(month)}</h2><div className="calendar-controls"><button className="icon-button" aria-label="Föregående månad" onClick={() => moveMonth(-1)}><ChevronLeft size={21} /></button><button className="icon-button" aria-label="Nästa månad" onClick={() => moveMonth(1)}><ChevronRight size={21} /></button></div></div><div className="month-grid">
      {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map(label => <span className="weekday-label" key={label}>{label}</span>)}
      {days.map(day => {
        const iso = toISO(day)
        const count = byDate.get(iso)?.length ?? 0
        return <button key={iso} className={`month-day ${day.getMonth() !== month.getMonth() ? 'outside' : ''} ${iso === selected ? 'selected' : ''} ${iso === toISO(new Date()) ? 'today' : ''}`} onClick={() => setSelected(iso)} aria-label={`${fullDateFormatter.format(day)}, ${count} aktiviteter`} aria-pressed={iso === selected}><span>{day.getDate()}</span>{count > 0 && <i className="day-dot" />}</button>
      })}
    </div></section><section className="calendar-detail"><div className="section-heading"><div><h2>{fullDateFormatter.format(fromISO(selected))}</h2><p>{selectedActivities.length} {selectedActivities.length === 1 ? 'aktivitet' : 'aktiviteter'}</p></div></div><ActivityList activities={selectedActivities} operations={operations} emptyText="Välj en annan dag eller lägg till en aktivitet." onSelect={onSelect} /></section></div>
  </div>
}

function App() {
  const [session, setSession] = useState<Session | null>(() => getDemoSession())
  const [theme, setTheme] = useState<Theme>(savedTheme)
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>(deviceTheme)
  const [activities, setActivities] = useState<Activity[]>([])
  const [operations, setOperations] = useState<Operation[]>([])
  const [members, setMembers] = useState<Member[]>(getMembers)
  const [consentEnabled, setConsentEnabledState] = useState(getConsentEnabled)
  const [view, setView] = useState<View>('home')
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const activityTrigger = useRef<HTMLElement | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!preference) return
    const updateTheme = () => setSystemTheme(preference.matches ? 'dark' : 'light')
    preference.addEventListener('change', updateTheme)
    return () => preference.removeEventListener('change', updateTheme)
  }, [])

  useEffect(() => {
    const activeTheme = theme === 'system' ? systemTheme : theme
    document.documentElement.dataset.theme = activeTheme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', activeTheme === 'light' ? '#f4f6f2' : '#151b1e')
  }, [theme, systemTheme])

  useEffect(() => {
    try {
      localStorage.setItem(themeKey, theme)
    } catch {
      // The selected theme still works for this session.
    }
  }, [theme])

  useEffect(() => {
    if (!session) return
    void Promise.all([demoRepository.getActivities(), demoRepository.getOperations()]).then(([items, availableOperations]) => {
      setActivities(items)
      setOperations(availableOperations)
    })
  }, [session])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  async function saveActivity(input: NewActivity) {
    const created = await demoRepository.createActivity(input)
    setActivities(current => [...current, created])
    setComposerOpen(false)
    setView('activities')
    setNotice('Aktiviteten är sparad i demon.')
  }

  function showActivity(activity: Activity) {
    activityTrigger.current = document.activeElement as HTMLElement
    setSelectedActivity(activity)
  }

  function closeActivity() {
    setSelectedActivity(null)
    window.requestAnimationFrame(() => activityTrigger.current?.focus())
  }

  function logout() {
    signOutOfDemo()
    setSession(null)
    setView('home')
  }

  function saveMember(member: Member) {
    setMembers(current => {
      const next = current.some(item => item.id === member.id) ? current.map(item => item.id === member.id ? member : item) : [...current, member]
      saveMembers(next)
      return next
    })
    setNotice('Medlemmen sparades i demon.')
  }

  function changeConsentEnabled(value: boolean) {
    setConsentEnabledState(value)
    setConsentEnabled(value)
    if (!value && view === 'members') setView('settings')
  }

  if (!session) return <Login onLogin={setSession} />

  const today = new Date()
  const weekStart = addDays(mondayOf(today), weekOffset * 7)
  const week = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  const weekEnd = toISO(addDays(weekStart, 7))
  const weekActivities = activities.filter(activity => activity.date >= toISO(weekStart) && activity.date < weekEnd)
  const visibleWeekActivities = selectedDay ? weekActivities.filter(activity => activity.date === selectedDay) : weekActivities
  const upcoming = [...activities].sort(activitySort).find(activity => new Date(`${activity.date}T${activity.startTime}:00`) >= today)
  const weekPeople = weekActivities.reduce((sum, activity) => sum + totalParticipants(activity), 0)

  const navigation: { id: View, label: string, icon: typeof LayoutGrid }[] = [
    { id: 'home', label: 'Översikt', icon: LayoutGrid },
    { id: 'activities', label: 'Aktiviteter', icon: List },
    { id: 'calendar', label: 'Kalender', icon: CalendarDays },
    ...(consentEnabled ? [{ id: 'members' as const, label: 'Samtyckeslistan', icon: ContactRound }] : []),
  ]

  return <div className="app-shell">
    <aside className="sidebar"><div className="sidebar-top"><Brand /><span className="workspace-name">Min verksamhet</span><nav aria-label="Huvudmeny">{navigation.map(item => <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} aria-current={view === item.id ? 'page' : undefined} onClick={() => setView(item.id)}><item.icon size={20} strokeWidth={1.8} />{item.label}</button>)}</nav></div><div className="sidebar-bottom"><div className="sidebar-demo"><span className="demo-dot" /><div><strong>Demoläge</strong><p>Exempeldata i din webbläsare</p></div></div><AccountMenu variant="sidebar" name={`${session.name} Lind`} email={session.email} onSettings={() => setView('settings')} onLogout={logout} /></div></aside>
    <div className="app-content"><header className="topbar"><div className="mobile-brand"><Brand /></div><span className="topbar-context">The Logbook <span>/</span> {view === 'settings' ? 'Inställningar' : navigation.find(item => item.id === view)?.label}</span><div className="topbar-actions"><button className="icon-button top-camera" type="button" aria-label="Skanna incheckningskort" title="Skanna incheckningskort" onClick={() => setScannerOpen(true)}><Camera size={20} aria-hidden="true" /></button><AccountMenu variant="top" name={`${session.name} Lind`} email={session.email} onSettings={() => setView('settings')} onLogout={logout} /></div></header>
      <main className="main-content">
        {view === 'home' && <div className="home-page"><div className="page-heading"><div><h1>Hej, {session.name}.</h1><p>Här är veckan i din verksamhet.</p></div><button className="button button-primary desktop-add" onClick={() => setComposerOpen(true)}><Plus size={19} /> Ny aktivitet</button></div>
          <div className="home-layout"><div className="home-primary"><div className="week-header"><div><h2>Din vecka</h2><p>{dateFormatter.format(weekStart)} – {dateFormatter.format(addDays(weekStart, 6))}</p></div><div className="calendar-controls"><button className="icon-button" aria-label="Föregående vecka" onClick={() => { setWeekOffset(value => value - 1); setSelectedDay(null) }}><ChevronLeft size={21} /></button><button className="icon-button" aria-label="Nästa vecka" onClick={() => { setWeekOffset(value => value + 1); setSelectedDay(null) }}><ChevronRight size={21} /></button></div></div>
            <div className="week-strip"><button className={`week-all ${selectedDay === null ? 'selected' : ''}`} onClick={() => setSelectedDay(null)} aria-pressed={selectedDay === null}>Alla</button>{week.map(day => { const iso = toISO(day); const count = weekActivities.filter(activity => activity.date === iso).length; return <button key={iso} className={`week-day ${selectedDay === iso ? 'selected' : ''} ${iso === toISO(today) ? 'today' : ''}`} onClick={() => setSelectedDay(iso)} aria-pressed={selectedDay === iso}><span>{weekdayFormatter.format(day).replace('.', '')}</span><strong>{day.getDate()}</strong><i className={count ? 'has-events' : ''} /></button> })}</div>
            <div className="section-heading"><div><h2>{selectedDay ? fullDateFormatter.format(fromISO(selectedDay)) : 'Veckans aktiviteter'}</h2><p>{visibleWeekActivities.length} {visibleWeekActivities.length === 1 ? 'aktivitet' : 'aktiviteter'}</p></div><button className="text-link" onClick={() => setView('activities')}>Visa alla <ArrowRight size={17} /></button></div>
            <ActivityList activities={visibleWeekActivities} operations={operations} emptyText="Välj en annan dag eller lägg till en aktivitet." onSelect={showActivity} />
          </div><aside className="home-aside"><div className="summary-card"><div className="summary-top"><span className="summary-icon"><CalendarDays size={21} /></span><span>Vald vecka</span></div><strong>{weekActivities.length}</strong><p>aktiviteter</p><div className="summary-divider" /><div className="summary-bottom"><Users size={18} /><span>{weekPeople} deltagare totalt</span></div></div><div className="next-card"><h3>Nästa aktivitet</h3>{upcoming ? <><div className="next-date">{fullDateFormatter.format(fromISO(upcoming.date))}</div><h4>{upcoming.title || operations.find(item => item.id === upcoming.operationId)?.name || 'Aktivitet'}</h4><p>{upcoming.title ? operations.find(item => item.id === upcoming.operationId)?.name : 'Utan eget namn'}</p><div className="next-time"><Clock3 size={17} /> {upcoming.startTime}–{upcoming.endTime}</div></> : <p>Inget planerat just nu.</p>}<button className="text-link" onClick={() => setView('calendar')}>Öppna kalender <ArrowRight size={17} /></button></div></aside></div></div>}
        {view === 'activities' && <div className="activities-page"><div className="page-heading"><div><h1>Aktiviteter</h1><p>Allt som händer i din verksamhet, samlat på ett ställe.</p></div><button className="button button-primary desktop-add" onClick={() => setComposerOpen(true)}><Plus size={19} /> Ny aktivitet</button></div><div className="activities-panel"><div className="section-heading"><div><h2>Alla aktiviteter</h2><p>{activities.length} registrerade aktiviteter</p></div></div><ActivityList activities={activities} operations={operations} emptyText="Lägg till din första aktivitet." onSelect={showActivity} /></div></div>}
        {view === 'calendar' && <CalendarView activities={activities} operations={operations} onAdd={() => setComposerOpen(true)} onSelect={showActivity} />}
        {view === 'members' && consentEnabled && <ConsentList members={members} operations={operations} onSave={saveMember} />}
        {view === 'settings' && <div className="settings-page"><div className="page-heading"><div><h1>Inställningar</h1><p>Anpassa hur The Logbook visas för dig.</p></div></div><section className="settings-card appearance-card" aria-labelledby="appearance-heading"><div><h2 id="appearance-heading">Utseende</h2><p>Följ enhetens inställning eller välj ett fast färgläge. Valet sparas i den här webbläsaren.</p></div><div className="theme-options" role="group" aria-label="Färgläge"><button type="button" className={theme === 'system' ? 'selected' : ''} aria-pressed={theme === 'system'} onClick={() => setTheme('system')}><Monitor size={20} /><span>Följ enheten</span>{theme === 'system' && <Check size={17} className="theme-check" />}</button><button type="button" className={theme === 'light' ? 'selected' : ''} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}><Sun size={20} /><span>Ljust läge</span>{theme === 'light' && <Check size={17} className="theme-check" />}</button><button type="button" className={theme === 'dark' ? 'selected' : ''} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}><Moon size={20} /><span>Mörkt läge</span>{theme === 'dark' && <Check size={17} className="theme-check" />}</button></div></section><section className="settings-card consent-setting"><div><h2>Samtyckeslistan</h2><p>Simulera om funktionen är aktiverad för verksamheten. När den är avstängd döljs länken och utflyktsvalet.</p></div><label className="setting-toggle"><input type="checkbox" checked={consentEnabled} onChange={event => changeConsentEnabled(event.target.checked)} /> Aktivera i demon</label></section></div>}
      </main>
    </div>
    <nav className="mobile-nav" aria-label="Mobil meny"><button aria-label="Översikt" className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}><LayoutGrid size={22} /><span>Översikt</span></button><button aria-label="Aktiviteter" className={view === 'activities' ? 'active' : ''} onClick={() => setView('activities')}><List size={22} /><span>Aktiviteter</span></button><button className="mobile-add" aria-label="Ny aktivitet" onClick={() => setComposerOpen(true)}><Plus size={26} /></button><button aria-label="Kalender" className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}><CalendarDays size={22} /><span>Kalender</span></button>{consentEnabled && <button aria-label="Samtyckeslistan" className={view === 'members' ? 'active' : ''} onClick={() => setView('members')}><ContactRound size={22} /><span>Medlemmar</span></button>}</nav>
    {selectedActivity && <ActivityDetails activity={selectedActivity} operation={operations.find(item => item.id === selectedActivity.operationId)} onClose={closeActivity} />}
    {composerOpen && <ActivityWizard operations={operations} members={members} consentEnabled={consentEnabled} onClose={() => setComposerOpen(false)} onSave={saveActivity} />}
    {scannerOpen && <CheckInScanner activities={activities} operations={operations} members={members} onClose={() => setScannerOpen(false)} />}
    {notice && <div className="toast" role="status"><Check size={18} />{notice}</div>}
  </div>
}

export default App
