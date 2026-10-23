import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CalendarDays, Clock3, MapPin, Share2, Users, X } from 'lucide-react'
import ActivityPhotos from './ActivityPhotos'
import type { Activity, Operation, ParticipantCounts } from './data/types'

const dateFormat = new Intl.DateTimeFormat('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const count = (values: ParticipantCounts) => values.women + values.men + values.other
const names = (values: string[]) => values.length ? values.join(', ') : 'Inga angivna'

export default function ActivityDetails({ activity, operation, onClose }: { activity: Activity, operation?: Operation, onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [shareMessage, setShareMessage] = useState('')
  const details = activity.details
  const title = activity.title || operation?.name || 'Aktivitet'
  const date = dateFormat.format(new Date(`${activity.date}T12:00:00`))
  const participantCount = count(activity.participants) + (details?.people.length ?? 0)

  async function shareActivity() {
    const text = `${title}\n${operation?.name ?? 'Verksamhet'} · ${date} · ${activity.startTime}–${activity.endTime}`
    setShareMessage('')
    try {
      if (navigator.share) {
        await navigator.share({ title, text })
      } else {
        await navigator.clipboard.writeText(text)
        setShareMessage('Aktivitetstexten kopierades. Klistra in den där du vill dela den.')
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setShareMessage('Det gick inte att dela. Försök igen.')
    }
  }

  useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return <div className="sheet-backdrop detail-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="activity-sheet detail-sheet" role="dialog" aria-modal="true" aria-labelledby="activity-detail-title">
      <header className="detail-header">
        <button ref={closeRef} className="detail-back" type="button" onClick={onClose}><ArrowLeft size={20} /> Tillbaka</button>
        <button className="icon-button" type="button" aria-label="Stäng aktivitetsdetaljer" onClick={onClose}><X size={20} /></button>
      </header>
      <div className="detail-scroll">
        <span className="detail-eyebrow">Aktivitet {details?.planned ? '· Planerad' : ''}{details?.excursion ? ' · Utflykt' : ''}</span>
        <h2 id="activity-detail-title">{title}</h2>
        <p className="detail-operation"><MapPin size={17} /> {operation?.name ?? 'Verksamhet'}</p>
        <div className="detail-facts">
          <div><CalendarDays size={20} /><span><small>Datum</small><strong>{date}{details?.endDate && details.endDate !== activity.date ? ` – ${dateFormat.format(new Date(`${details.endDate}T12:00:00`))}` : ''}</strong></span></div>
          <div><Clock3 size={20} /><span><small>Tid</small><strong>{activity.startTime}–{activity.endTime}</strong></span></div>
          <div><Users size={20} /><span><small>Deltagare</small><strong>{participantCount}</strong></span></div>
        </div>
        <section className="detail-section activity-share"><h3>Dela aktivitet</h3><p>Dela titel, verksamhet och tid. Deltagare, anteckningar och bilder följer inte med.</p><button className="button button-primary" type="button" onClick={() => void shareActivity()}><Share2 size={18} /> Dela i sociala medier</button>{shareMessage && <p className="activity-share-message" role="status">{shareMessage}</p>}</section>
        <section className="detail-section"><h3>Deltagare</h3>
          <div className="detail-counts"><div><strong>{activity.participants.women}</strong><span>Kvinnor</span></div><div><strong>{activity.participants.men}</strong><span>Män</span></div><div><strong>{activity.participants.other}</strong><span>Övriga</span></div></div>
          {details?.people.length ? <div className="detail-people"><h4>Registrerade deltagare och volontärer</h4>{details.people.map(person => <div key={person.id}><strong>{person.name}</strong><span>{[person.volunteer && 'Volontär', person.assisting && 'Assisterande', person.producing && 'Producerande'].filter(Boolean).join(' · ')}</span></div>)}</div> : null}
          {details && Object.entries(details.ageGroups).some(([, values]) => count(values) > 0) && <div className="detail-people"><h4>Åldersgrupper, anonyma deltagare</h4>{Object.entries(details.ageGroups).filter(([, values]) => count(values) > 0).map(([band, values]) => <div key={band}><strong>{band}</strong><span>{values.women} kvinnor · {values.men} män · {values.other} övriga</span></div>)}</div>}
        </section>
        {details && <>
          {(count(details.assisting) > 0 || count(details.producing) > 0) && <section className="detail-section"><h3>Delaktighet</h3><div className="detail-stat-row"><span>Assisterande</span><strong>{count(details.assisting)}</strong></div><div className="detail-stat-row"><span>Producerande</span><strong>{count(details.producing)}</strong></div></section>}
          {(details.staff.length > 0 || details.activityTypes.length > 0 || details.tags.length > 0) && <section className="detail-section"><h3>Om aktiviteten</h3>{details.staff.length > 0 && <div className="detail-info"><span>Personal</span><strong>{names(details.staff)}</strong></div>}{details.activityTypes.length > 0 && <div className="detail-info"><span>Aktivitetstyper</span><strong>{names(details.activityTypes)}</strong></div>}{details.tags.length > 0 && <div className="detail-info"><span>Taggar</span><strong>{names(details.tags)}</strong></div>}</section>}
          {(details.planning !== 'none' || details.producedHours > 0 || details.producedActivity) && <section className="detail-section"><h3>Planering och produktion</h3>{details.planning !== 'none' && <div className="detail-info"><span>Planering av unga</span><strong>{details.planning === 'advance' ? 'I förväg' : 'Samma dag'}</strong></div>}{Object.entries(details.responsibilities).filter(([, active]) => active).length > 0 && <div className="detail-info"><span>Ansvar</span><strong>{Object.entries(details.responsibilities).filter(([, active]) => active).map(([key]) => ({ idea: 'Idé', planning: 'Planering', preparation: 'Förberedelse', implementation: 'Genomförande', evaluation: 'Utvärdering' })[key as keyof typeof details.responsibilities]).join(', ')}</strong></div>}{details.producedHours > 0 && <div className="detail-info"><span>Producerad tid</span><strong>{details.producedHours} timmar</strong></div>}{details.producedActivity && <p>{details.producedActivity}</p>}</section>}
          {details.excursionDetails && <section className="detail-section"><h3>Utflykt</h3>{details.excursionDetails.planning && <p>{details.excursionDetails.planning}</p>}{details.excursionDetails.riskAssessmentParticipants && <div className="detail-info"><span>Riskbedömning, deltagare</span><strong>{details.excursionDetails.riskAssessmentParticipants}</strong></div>}{details.excursionDetails.riskAssessmentResponsible && <div className="detail-info"><span>Ansvarig chef</span><strong>{details.excursionDetails.riskAssessmentResponsible}</strong></div>}{details.excursionDetails.risks.map((risk, index) => <div className="detail-risk" key={index}><strong>{risk.risk}</strong><span>Sannolikhet {risk.probability} · Konsekvens {risk.consequence}</span>{risk.action && <p>{risk.action}</p>}{risk.responsible && <small>Ansvarig: {risk.responsible}</small>}</div>)}{details.excursionDetails.staff.map((person, index) => <div className="detail-stat-row" key={index}><span>{person.name}</span><strong>{person.responsibility}</strong></div>)}</section>}
          {details.notes && <section className="detail-section"><h3>{details.excursion ? 'Utvärdering' : 'Anteckningar'}</h3><p className="detail-notes">{details.notes}</p></section>}
        </>}
        <ActivityPhotos activityId={activity.id} />
      </div>
    </section>
  </div>
}
