import { useEffect, useRef, useState, type FormEvent, type TouchEvent } from 'react'
import { ArrowRight, ChevronLeft, Plus, X } from 'lucide-react'
import type { ActivityDetails, ActivityPerson, Member, NewActivity, Operation, ParticipantCounts } from './data/types'

const emptyCounts = (): ParticipantCounts => ({ women: 0, men: 0, other: 0 })
const genders: { key: keyof ParticipantCounts, label: string }[] = [
  { key: 'women', label: 'Kvinnor' }, { key: 'men', label: 'Män' }, { key: 'other', label: 'Övriga' },
]
const ageBands = ['Under 13 år', '13–15 år', '16–18 år', '19–25 år', '26 år och äldre']
const responsibilityLabels: { key: keyof ActivityDetails['responsibilities'], label: string }[] = [
  { key: 'idea', label: 'Idé' }, { key: 'planning', label: 'Planering' },
  { key: 'preparation', label: 'Förberedelse' }, { key: 'implementation', label: 'Genomförande' },
  { key: 'evaluation', label: 'Utvärdering' },
]
const steps = ['Grunduppgifter', 'Deltagare', 'Delaktighet', 'Anteckningar']
const dateToday = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const validCount = (value: number) => Number.isInteger(value) && value >= 0
const sum = (counts: ParticipantCounts) => counts.women + counts.men + counts.other
const splitNames = (value: string) => value.split(',').map(name => name.trim()).filter(Boolean)
type ValidationIssue = { step: number, fieldId: string, message: string }

function CountField({ id, value, max, invalid, onChange }: { id: string, value: number, max?: number, invalid?: boolean, onChange: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(String(value))
  }, [value])

  return <input ref={inputRef} id={id} className={invalid ? 'wizard-invalid' : undefined} aria-invalid={invalid || undefined} type="number" inputMode="numeric" min="0" max={max} step="1" value={draft}
    onChange={event => {
      const next = event.target.value
      setDraft(next)
      onChange(next === '' ? 0 : Number(next))
    }}
    onBlur={() => setDraft(String(value))}
    onWheel={event => { if (document.activeElement === event.currentTarget) event.currentTarget.blur() }} />
}

export default function ActivityWizard({ operations, members, consentEnabled, onClose, onSave }: { operations: Operation[], members: Member[], consentEnabled: boolean, onClose: () => void, onSave: (input: NewActivity) => Promise<void> }) {
  const [step, setStep] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'none' | 'forward' | 'back'>('none')
  const [title, setTitle] = useState('')
  const [operationId, setOperationId] = useState('')
  const [date, setDate] = useState(dateToday)
  const [endDate, setEndDate] = useState(dateToday)
  const [startTime, setStartTime] = useState('15:00')
  const [endTime, setEndTime] = useState('17:00')
  const [planned, setPlanned] = useState(false)
  const [excursion, setExcursion] = useState(false)
  const [participants, setParticipants] = useState(emptyCounts)
  const [assisting, setAssisting] = useState(emptyCounts)
  const [producing, setProducing] = useState(emptyCounts)
  const [people, setPeople] = useState<ActivityPerson[]>([])
  const [newPerson, setNewPerson] = useState('')
  const [newPersonGender, setNewPersonGender] = useState<keyof ParticipantCounts>('women')
  const [newPersonVolunteer, setNewPersonVolunteer] = useState(false)
  const [ageGroups, setAgeGroups] = useState<Record<string, ParticipantCounts>>({})
  const [staff, setStaff] = useState('')
  const [tags, setTags] = useState('')
  const [activityTypes, setActivityTypes] = useState('')
  const [planning, setPlanning] = useState<ActivityDetails['planning']>('none')
  const [responsibilities, setResponsibilities] = useState<ActivityDetails['responsibilities']>({ idea: false, planning: false, preparation: false, implementation: false, evaluation: false })
  const [producedHours, setProducedHours] = useState(0)
  const [producedActivity, setProducedActivity] = useState('')
  const [notes, setNotes] = useState('')
  const [excursionPlanning, setExcursionPlanning] = useState('')
  const [riskParticipants, setRiskParticipants] = useState('')
  const [riskResponsible, setRiskResponsible] = useState('')
  const [risks, setRisks] = useState<NonNullable<ActivityDetails['excursionDetails']>['risks']>([])
  const [excursionStaff, setExcursionStaff] = useState<NonNullable<ActivityDetails['excursionDetails']>['staff']>([
    { name: '', responsibility: 'Första hjälpen' }, { name: '', responsibility: 'Informera vårdnadshavare' },
  ])
  const [error, setError] = useState('')
  const [invalidFieldId, setInvalidFieldId] = useState('')
  const [saving, setSaving] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number, y: number } | null>(null)
  const focusTimerRef = useRef<number | null>(null)
  const selectedOperation = operations.find(operation => operation.id === operationId)
  const isOutreach = selectedOperation?.kind === 'outreach'
  const isClosedGroup = selectedOperation?.kind === 'closedGroup'
  const excursionMembers = members.filter(member => !member.archived && member.groupId === operationId)
  const excursionPeople = people.filter(person => person.memberId && excursionMembers.some(member => member.id === person.memberId))
  const requiredResponsibilities = planning === 'advance'
    ? ['planning', 'preparation', 'implementation'] as const
    : planning === 'today' ? ['idea', 'planning', 'preparation', 'implementation', 'evaluation'] as const : []
  const mayProduce = requiredResponsibilities.length > 0 && requiredResponsibilities.every(key => responsibilities[key])
  const hasProduction = mayProduce && producedHours > 0

  useEffect(() => () => { if (focusTimerRef.current !== null) window.clearTimeout(focusTimerRef.current) }, [])

  function changeStep(next: number, issue?: ValidationIssue) {
    if (next < 0 || next >= steps.length || next === step) return
    if (focusTimerRef.current !== null) window.clearTimeout(focusTimerRef.current)
    setSlideDirection(next > step ? 'forward' : 'back')
    setError('')
    setInvalidFieldId('')
    setStep(next)
    scrollRef.current?.scrollTo({ top: 0 })
    if (issue) showIssue(issue)
  }

  function showIssue(issue: ValidationIssue) {
    setError(issue.message)
    setInvalidFieldId(issue.fieldId)
    if (focusTimerRef.current !== null) window.clearTimeout(focusTimerRef.current)
    focusTimerRef.current = window.setTimeout(() => {
      const field = document.getElementById(issue.fieldId)
      const details = field?.closest('details')
      if (details) details.open = true
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      field?.focus({ preventScroll: true })
    }, issue.step === step ? 0 : 260)
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 1 || (event.target as HTMLElement).closest('input, select, textarea, button, summary, [contenteditable]')) {
      touchStartRef.current = null
      return
    }
    touchStartRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start || event.changedTouches.length !== 1 || saving) return
    const dx = event.changedTouches[0].clientX - start.x
    const dy = event.changedTouches[0].clientY - start.y
    if (Math.abs(dx) < 65 || Math.abs(dx) < Math.abs(dy) * 1.4) return
    changeStep(step + (dx < 0 ? 1 : -1))
  }

  function changeCount(setter: (value: ParticipantCounts) => void, current: ParticipantCounts, key: keyof ParticipantCounts, value: number) {
    setter({ ...current, [key]: value })
  }

  function addPerson() {
    const name = newPerson.trim()
    if (!name) return
    setPeople(items => [...items, { id: crypto.randomUUID(), name, gender: newPersonGender, volunteer: newPersonVolunteer, assisting: false, producing: false }])
    setNewPerson('')
    setNewPersonVolunteer(false)
  }

  function updatePerson(id: string, changes: Partial<ActivityPerson>) {
    setPeople(items => items.map(item => item.id === id ? { ...item, ...changes } : item))
  }

  function toggleMember(member: Member) {
    if (member.consentStatus !== 'given' || !member.acceptsExcursion) return
    setPeople(items => items.some(person => person.memberId === member.id)
      ? items.filter(person => person.memberId !== member.id)
      : [...items, { id: crypto.randomUUID(), memberId: member.id, name: member.name, gender: member.gender, volunteer: false, assisting: false, producing: false }])
  }

  function validateStep(current: number): ValidationIssue | null {
    if (current === 0) {
      if (!operationId) return { step: current, fieldId: 'operation', message: 'Välj verksamhet.' }
      if (!date) return { step: current, fieldId: 'date', message: 'Ange startdatum.' }
      if (!endDate || endDate < date) return { step: current, fieldId: 'end-date', message: 'Ange ett slutdatum som inte är före startdatumet.' }
      if (!startTime) return { step: current, fieldId: 'start', message: 'Ange starttid.' }
      if (!endTime || (endDate === date && endTime <= startTime)) return { step: current, fieldId: 'end', message: 'Sluttiden måste vara senare än starttiden.' }
      if (excursion && (!isClosedGroup || !consentEnabled)) return { step: current, fieldId: 'operation', message: 'Utflykt kräver sluten grupp och aktiverad samtyckeslista.' }
    }
    if (current === 1 && !excursion) {
      for (const { key, label } of genders) {
        if (!validCount(participants[key])) return { step: current, fieldId: `count-${key}`, message: `${label}: ange ett helt antal från 0 och uppåt.` }
        if (!isOutreach) {
          for (const [band, counts] of Object.entries(ageGroups)) {
            if (!validCount(counts[key])) return { step: current, fieldId: `age-${band}-${key}`, message: `${label} i ${band}: ange ett helt antal från 0 och uppåt.` }
          }
          if (Object.values(ageGroups).reduce((total, counts) => total + counts[key], 0) > participants[key]) return { step: current, fieldId: `count-${key}`, message: `${label}: åldersgrupperna kan inte överstiga antalet anonyma deltagare.` }
        }
      }
    }
    if (current === 1 && !isOutreach && !excursion && newPerson.trim()) return { step: current, fieldId: 'person-name', message: 'Lägg till aliaset eller töm fältet innan du sparar.' }
    if (current === 1 && excursion && excursionPeople.length === 0) return { step: current, fieldId: 'excursion-members', message: 'Välj minst en deltagare med godkänt samtycke och medgivande till utflykt.' }
    if (current === 2) {
      if (!Number.isFinite(producedHours) || producedHours < 0 || producedHours > 24 || producedHours * 4 % 1 !== 0) return { step: current, fieldId: 'produced-hours', message: 'Producerad tid måste anges i 15-minuterssteg mellan 0 och 24 timmar.' }
      if (!isOutreach && !excursion) {
        for (const { key, label } of genders) {
          if (!validCount(assisting[key]) || assisting[key] > participants[key]) return { step: current, fieldId: `assisting-${key}`, message: `${label}: assisterande kan inte överstiga antalet anonyma deltagare.` }
          if (hasProduction && (!validCount(producing[key]) || assisting[key] + producing[key] > participants[key])) return { step: current, fieldId: `producing-${key}`, message: `${label}: assisterande och producerande kan inte överstiga antalet anonyma deltagare.` }
        }
      }
    }
    if (current === 3 && excursion) {
      for (let index = 0; index < risks.length; index++) {
        const risk = risks[index]
        if (!risk.risk.trim() && (risk.action.trim() || risk.responsible.trim())) return { step: current, fieldId: `risk-${index}-risk`, message: 'Beskriv risken eller ta bort den.' }
        if (risk.risk.trim() && !risk.action.trim()) return { step: current, fieldId: `risk-${index}-action`, message: 'Ange en åtgärd för risken.' }
        if (risk.risk.trim() && !risk.responsible.trim()) return { step: current, fieldId: `risk-${index}-responsible`, message: 'Ange vem som ansvarar för risken.' }
      }
    }
    return null
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step === steps.length - 1) {
      const issue = steps.map((_, index) => validateStep(index)).find((item): item is ValidationIssue => item !== null)
      if (issue) {
        if (issue.step === step) showIssue(issue)
        else changeStep(issue.step, issue)
        return
      }
    }
    if (step < steps.length - 1) { changeStep(step + 1); return }
    const details: ActivityDetails = {
      endDate, planned, excursion, staff: splitNames(staff), tags: splitNames(tags), activityTypes: isOutreach ? [] : splitNames(activityTypes),
      people: isOutreach ? [] : (excursion ? excursionPeople : people).map(person => ({ ...person, producing: hasProduction && person.producing })),
      assisting: isOutreach || excursion ? emptyCounts() : assisting,
      producing: hasProduction && !isOutreach && !excursion ? producing : emptyCounts(),
      ageGroups: isOutreach || excursion ? {} : ageGroups,
      planning: isOutreach ? 'none' : planning,
      responsibilities: isOutreach ? { idea: false, planning: false, preparation: false, implementation: false, evaluation: false } : responsibilities,
      producedHours: hasProduction && !isOutreach ? producedHours : 0,
      producedActivity: hasProduction && !isOutreach ? producedActivity.trim() : '', notes: notes.trim(),
      excursionDetails: excursion ? { planning: excursionPlanning.trim(), riskAssessmentParticipants: riskParticipants.trim(), riskAssessmentResponsible: riskResponsible.trim(), risks: risks.filter(risk => risk.risk.trim()), staff: excursionStaff.filter(item => item.name.trim() || item.responsibility.trim()) } : undefined,
    }
    setSaving(true)
    try {
      await onSave({ title: title.trim(), operationId, date, startTime, endTime, participants: excursion ? emptyCounts() : participants, details })
    } catch {
      setError('Aktiviteten kunde inte sparas. Försök igen.')
      setSaving(false)
    }
  }

  return <div className="sheet-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="activity-sheet wizard-sheet" role="dialog" aria-modal="true" aria-labelledby="form-title">
      <header className="sheet-header"><div><h2 id="form-title">Ny aktivitet</h2><p>Steg {step + 1} av {steps.length} · {steps[step]}</p></div><button className="icon-button" type="button" aria-label="Stäng" onClick={onClose}><X size={22} /></button></header>
      <div className="wizard-progress" aria-label="Formulärsteg">{steps.map((label, index) => <span key={label} className={index <= step ? 'active' : ''} title={label} />)}</div>
      <form onSubmit={submit} className="activity-form" noValidate onInputCapture={event => { if ((event.target as HTMLElement).id === invalidFieldId) { setError(''); setInvalidFieldId('') } }} onChangeCapture={event => { if ((event.target as HTMLElement).id === invalidFieldId) { setError(''); setInvalidFieldId('') } }}>
        <div className="form-scroll" ref={scrollRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={() => { touchStartRef.current = null }}>
          <div key={step} className={`wizard-step wizard-step-${slideDirection}`}>
          {error && <p className="wizard-error" role="alert">{error}</p>}
          {step === 0 && <>
            <h3 className="wizard-title">Vad har hänt?</h3>
            <label htmlFor="operation">Verksamhet</label><select id="operation" className={invalidFieldId === 'operation' ? 'wizard-invalid' : undefined} aria-invalid={invalidFieldId === 'operation' || undefined} value={operationId} onChange={event => { setOperationId(event.target.value); setExcursion(false) }} required><option value="">Välj verksamhet</option>{operations.map(operation => <option value={operation.id} key={operation.id}>{operation.name}</option>)}</select>
            <label htmlFor="title">Aktivitetens namn (frivilligt)</label><input id="title" value={title} onChange={event => setTitle(event.target.value)} placeholder="T.ex. Musikverkstad" maxLength={256} />
            <div className="form-grid-two"><div><label htmlFor="date">Från datum</label><input id="date" className={invalidFieldId === 'date' ? 'wizard-invalid' : undefined} aria-invalid={invalidFieldId === 'date' || undefined} type="date" value={date} onChange={event => { setDate(event.target.value); if (endDate < event.target.value) setEndDate(event.target.value) }} required /></div><div><label htmlFor="end-date">Till datum</label><input id="end-date" className={invalidFieldId === 'end-date' ? 'wizard-invalid' : undefined} aria-invalid={invalidFieldId === 'end-date' || undefined} type="date" min={date} value={endDate} onChange={event => setEndDate(event.target.value)} required /></div></div>
            <div className="form-grid-two"><div><label htmlFor="start">Starttid</label><input id="start" className={invalidFieldId === 'start' ? 'wizard-invalid' : undefined} aria-invalid={invalidFieldId === 'start' || undefined} type="time" step="900" value={startTime} onChange={event => setStartTime(event.target.value)} required /></div><div><label htmlFor="end">Sluttid</label><input id="end" className={invalidFieldId === 'end' ? 'wizard-invalid' : undefined} aria-invalid={invalidFieldId === 'end' || undefined} type="time" step="900" value={endTime} onChange={event => setEndTime(event.target.value)} required /></div></div>
            <label className="wizard-check"><input type="checkbox" checked={planned} onChange={event => setPlanned(event.target.checked)} /> Planerad aktivitet</label>
            {isClosedGroup && consentEnabled && <label className="wizard-check"><input type="checkbox" checked={excursion} onChange={event => setExcursion(event.target.checked)} /> Utflykt</label>}
            <p className="form-demo-note">Demoläge: verksamheterna är exempel och sparandet sker i den här webbläsaren.</p>
          </>}
          {step === 1 && <>
            <h3 className="wizard-title">Vilka deltog?</h3><p className="wizard-help">{excursion ? 'Välj deltagare ur samtyckeslistan för den slutna gruppen. Status och medgivanden visas innan du väljer.' : <>Ange anonyma deltagare per kön. {isOutreach ? 'För uppsökande arbete räknas etablerade kontakter.' : 'Alias och volontärer läggs till separat.'}</>}</p>
            {excursion && <div id="excursion-members" tabIndex={-1} className={invalidFieldId === 'excursion-members' ? 'wizard-invalid excursion-members' : 'excursion-members'}><strong>Samtyckeslistan · {selectedOperation?.name}</strong>{excursionMembers.length === 0 && <p>Det finns inga medlemmar i gruppen. Lägg till dem i Samtyckeslistan först.</p>}{excursionMembers.map(member => { const selected = excursionPeople.some(person => person.memberId === member.id); const eligible = member.consentStatus === 'given' && member.acceptsExcursion; return <label className={`excursion-member ${eligible ? '' : 'ineligible'}`} key={member.id}><input type="checkbox" checked={selected} disabled={!eligible} onChange={() => toggleMember(member)} /><span><b>{member.name}</b><small>{new Date().getFullYear() - member.birthYear} år · {member.consentStatus === 'given' ? 'Samtycke godkänt' : member.consentStatus === 'waiting' ? 'Väntar på samtycke' : 'Samtycke nekat'} · {member.acceptsExcursion ? 'Utflykt medges' : 'Utflykt medges inte'}{member.acceptsVehicle ? ' · Fordon medges' : ' · Fordon medges inte'}{member.hasSwimmingAbility ? ' · Simkunnig' : ' · Simkunnighet ej angiven'}{member.note ? ` · ${member.note}` : ''}</small></span></label> })}</div>}
            {!excursion && <div className="form-grid-three">{genders.map(({ key, label }) => <div key={key}><label htmlFor={`count-${key}`}>{label}</label><CountField id={`count-${key}`} value={participants[key]} invalid={invalidFieldId === `count-${key}`} onChange={value => changeCount(setParticipants, participants, key, value)} /></div>)}</div>}
            {!isOutreach && !excursion && <>
              <div className="form-section-title"><h3>Åldersgrupper</h3><p>Frivillig fördelning av de anonyma deltagarna.</p></div>
              {ageBands.map(band => <details className="wizard-detail" key={band}><summary>{band}</summary><div className="form-grid-three">{genders.map(({ key, label }) => <div key={key}><label htmlFor={`age-${band}-${key}`}>{label}</label><CountField id={`age-${band}-${key}`} value={ageGroups[band]?.[key] ?? 0} invalid={invalidFieldId === `age-${band}-${key}`} onChange={value => setAgeGroups(current => ({ ...current, [band]: { ...(current[band] ?? emptyCounts()), [key]: value } }))} /></div>)}</div></details>)}
            </>}
            {!isOutreach && !excursion && <>
              <div className="form-section-title"><h3>Deltagare med alias och volontärer</h3><p>Lägg till de personer som ska räknas separat.</p></div>
              <div className="form-grid-two"><div><label htmlFor="person-name">Alias</label><input id="person-name" className={invalidFieldId === 'person-name' ? 'wizard-invalid' : undefined} aria-invalid={invalidFieldId === 'person-name' || undefined} value={newPerson} onChange={event => setNewPerson(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addPerson() } }} placeholder="Alias" /></div><div><label htmlFor="person-gender">Kön</label><select id="person-gender" value={newPersonGender} onChange={event => setNewPersonGender(event.target.value as keyof ParticipantCounts)}>{genders.map(({ key, label }) => <option value={key} key={key}>{label}</option>)}</select></div></div>
              <label className="wizard-check"><input type="checkbox" checked={newPersonVolunteer} onChange={event => setNewPersonVolunteer(event.target.checked)} /> Volontär</label>
              <button className="button button-quiet wizard-add" type="button" onClick={addPerson}><Plus size={17} /> Lägg till alias</button>
              {people.map(person => <div className="wizard-person" key={person.id}><div><strong>{person.name}</strong><small>{person.volunteer ? 'Volontär' : 'Deltagare'} · {genders.find(item => item.key === person.gender)?.label}</small></div><button className="icon-button" type="button" aria-label={`Ta bort ${person.name}`} onClick={() => setPeople(items => items.filter(item => item.id !== person.id))}><X size={17} /></button></div>)}
            </>}
          </>}
          {step === 2 && <>
            <h3 className="wizard-title">Delaktighet och innehåll</h3>
            <label htmlFor="staff">Personal</label><input id="staff" value={staff} onChange={event => setStaff(event.target.value)} placeholder="Namn separerade med kommatecken" /><p className="field-hint">I demon anger du namn. I KEKS väljs personal från verksamhetens lista.</p>
            {!isOutreach && <><label htmlFor="types">Aktivitetstyper</label><input id="types" value={activityTypes} onChange={event => setActivityTypes(event.target.value)} placeholder="T.ex. Musik, skapande" /></>}
            <label htmlFor="tags">Taggar</label><input id="tags" value={tags} onChange={event => setTags(event.target.value)} placeholder="Separera med kommatecken" />
            {!isOutreach && <>
              <div className="form-section-title"><h3>Ungas delaktighet</h3><p>Följ samma definition som i KEKS för producerande.</p></div>
              <label htmlFor="planning">När planerades aktiviteten av unga?</label><select id="planning" value={planning} onChange={event => { setPlanning(event.target.value as ActivityDetails['planning']); setProducedHours(0) }}><option value="none">Inte planerad av unga</option><option value="advance">I förväg</option><option value="today">Samma dag</option></select>
              {planning !== 'none' && <><p className="wizard-help">Vilka delar tog unga ansvar för?</p><div className="wizard-check-list">{responsibilityLabels.filter(item => planning === 'today' || (item.key !== 'idea' && item.key !== 'evaluation')).map(({ key, label }) => <label className="wizard-check" key={key}><input type="checkbox" checked={responsibilities[key]} onChange={event => setResponsibilities(current => ({ ...current, [key]: event.target.checked }))} /> {label}</label>)}</div></>}
              {mayProduce && <><label htmlFor="produced-hours">Producerad tid</label><select id="produced-hours" className={invalidFieldId === 'produced-hours' ? 'wizard-invalid' : undefined} aria-invalid={invalidFieldId === 'produced-hours' || undefined} value={producedHours} onChange={event => setProducedHours(Number(event.target.value))}>{Array.from({ length: 97 }, (_, i) => <option value={i / 4} key={i}>{Math.floor(i / 4)} h {String((i % 4) * 15).padStart(2, '0')} min</option>)}</select></>}
              {hasProduction && <><label htmlFor="produced-activity">Beskriv vad de producerade</label><input id="produced-activity" value={producedActivity} onChange={event => setProducedActivity(event.target.value)} /></>}
              <div className="form-section-title"><h3>Assisterande {hasProduction ? 'och producerande' : ''}</h3><p>Fördelas inom de anonyma deltagarna. Alias markeras var för sig.</p></div>
              {!excursion && genders.map(({ key, label }) => <div className="wizard-role-row" key={key}><strong>{label} <small>av {participants[key]} anonyma</small></strong><div className="form-grid-two"><div><label htmlFor={`assisting-${key}`}>Assisterande</label><CountField id={`assisting-${key}`} value={assisting[key]} max={participants[key]} invalid={invalidFieldId === `assisting-${key}`} onChange={value => changeCount(setAssisting, assisting, key, value)} /></div>{hasProduction && <div><label htmlFor={`producing-${key}`}>Producerande</label><CountField id={`producing-${key}`} value={producing[key]} max={participants[key]} invalid={invalidFieldId === `producing-${key}`} onChange={value => changeCount(setProducing, producing, key, value)} /></div>}</div></div>)}
              {(excursion ? excursionPeople : people).length > 0 && <><div className="form-section-title"><h3>{excursion ? 'Valda deltagare' : 'Alias och volontärer'}</h3></div>{(excursion ? excursionPeople : people).map(person => <div className="wizard-person" key={person.id}><div><strong>{person.name}</strong><small>{person.volunteer ? 'Volontär' : 'Deltagare'}</small></div><label className="wizard-check"><input type="checkbox" checked={person.assisting} onChange={event => updatePerson(person.id, { assisting: event.target.checked, producing: event.target.checked ? false : person.producing })} /> Assisterande</label>{hasProduction && <label className="wizard-check"><input type="checkbox" checked={person.producing} onChange={event => updatePerson(person.id, { producing: event.target.checked, assisting: event.target.checked ? false : person.assisting })} /> Producerande</label>}</div>)}</>}
            </>}
          </>}
          {step === 3 && <>
            <h3 className="wizard-title">Anteckningar och kontroll</h3>
            {excursion && <>
              <div className="form-section-title"><h3>Utflyktsplanering</h3></div><label htmlFor="excursion-planning">Planering</label><textarea id="excursion-planning" value={excursionPlanning} onChange={event => setExcursionPlanning(event.target.value)} rows={3} />
              <label htmlFor="risk-participants">Deltagare i riskbedömningen</label><input id="risk-participants" value={riskParticipants} onChange={event => setRiskParticipants(event.target.value)} />
              <label htmlFor="risk-responsible">Ansvarig chef</label><input id="risk-responsible" value={riskResponsible} onChange={event => setRiskResponsible(event.target.value)} />
              <div className="form-section-title"><h3>Risker</h3></div>
              {risks.map((risk, index) => <div className="wizard-block" key={index}><div className="wizard-block-heading"><strong>Risk {index + 1}</strong><button className="icon-button" type="button" aria-label={`Ta bort risk ${index + 1}`} onClick={() => setRisks(items => items.filter((_, i) => i !== index))}><X size={16} /></button></div><label htmlFor={`risk-${index}-risk`}>Identifierad risk</label><textarea id={`risk-${index}-risk`} className={invalidFieldId === `risk-${index}-risk` ? 'wizard-invalid' : undefined} aria-invalid={invalidFieldId === `risk-${index}-risk` || undefined} value={risk.risk} onChange={event => setRisks(items => items.map((item, i) => i === index ? { ...item, risk: event.target.value } : item))} /><div className="form-grid-two"><label>Sannolikhet<select value={risk.probability} onChange={event => setRisks(items => items.map((item, i) => i === index ? { ...item, probability: Number(event.target.value) } : item))}>{[1, 2, 3, 4, 5].map(value => <option key={value}>{value}</option>)}</select></label><label>Konsekvens<select value={risk.consequence} onChange={event => setRisks(items => items.map((item, i) => i === index ? { ...item, consequence: Number(event.target.value) } : item))}>{[1, 2, 3, 4, 5].map(value => <option key={value}>{value}</option>)}</select></label></div><label htmlFor={`risk-${index}-action`}>Åtgärd</label><textarea id={`risk-${index}-action`} className={invalidFieldId === `risk-${index}-action` ? 'wizard-invalid' : undefined} aria-invalid={invalidFieldId === `risk-${index}-action` || undefined} value={risk.action} onChange={event => setRisks(items => items.map((item, i) => i === index ? { ...item, action: event.target.value } : item))} /><label htmlFor={`risk-${index}-responsible`}>Ansvarig</label><input id={`risk-${index}-responsible`} className={invalidFieldId === `risk-${index}-responsible` ? 'wizard-invalid' : undefined} aria-invalid={invalidFieldId === `risk-${index}-responsible` || undefined} value={risk.responsible} onChange={event => setRisks(items => items.map((item, i) => i === index ? { ...item, responsible: event.target.value } : item))} /></div>)}
              <button className="button button-quiet wizard-add" type="button" onClick={() => setRisks(items => [...items, { risk: '', probability: 1, consequence: 1, action: '', responsible: '' }])}><Plus size={17} /> Lägg till risk</button>
              <div className="form-section-title"><h3>Ansvarsfördelning</h3></div>{excursionStaff.map((item, index) => <div className="wizard-block" key={index}><div className="wizard-block-heading"><strong>Uppgift {index + 1}</strong><button className="icon-button" type="button" aria-label={`Ta bort uppgift ${index + 1}`} onClick={() => setExcursionStaff(items => items.filter((_, i) => i !== index))}><X size={16} /></button></div><label>Personal<input value={item.name} onChange={event => setExcursionStaff(items => items.map((entry, i) => i === index ? { ...entry, name: event.target.value } : entry))} /></label><label>Ansvar<input value={item.responsibility} onChange={event => setExcursionStaff(items => items.map((entry, i) => i === index ? { ...entry, responsibility: event.target.value } : entry))} /></label></div>)}<button className="button button-quiet wizard-add" type="button" onClick={() => setExcursionStaff(items => [...items, { name: '', responsibility: '' }])}><Plus size={17} /> Lägg till uppgift</button>
            </>}
            <label htmlFor="notes">{excursion ? 'Utvärdering' : 'Anteckningar'}</label><textarea id="notes" value={notes} onChange={event => setNotes(event.target.value)} rows={5} placeholder="Vad gick bra? Vad vill ni följa upp?" />
            <div className="wizard-summary"><strong>Sammanfattning</strong><p>{title.trim() ? `${title.trim()} · ` : ''}{selectedOperation?.name || 'Välj verksamhet'}</p><p>{date}{endDate !== date ? ` – ${endDate}` : ''} · {startTime}–{endTime}</p><p>{(excursion ? 0 : sum(participants)) + (excursion ? excursionPeople.length : people.length)} deltagare och volontärer totalt · {splitNames(staff).length} personal</p></div>
            <p className="form-demo-note">Aktiviteten sparas lokalt i den här webbläsaren. Inga uppgifter skickas till KEKS.</p>
          </>}
          </div>
        </div>
        <footer className="sheet-footer"><button className="button button-quiet" type="button" onClick={() => step === 0 ? onClose() : changeStep(step - 1)}>{step === 0 ? 'Avbryt' : <><ChevronLeft size={18} /> Tillbaka</>}</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Sparar…' : step === steps.length - 1 ? 'Spara aktivitet' : 'Nästa'} <ArrowRight size={18} /></button></footer>
      </form>
    </section>
  </div>
}
