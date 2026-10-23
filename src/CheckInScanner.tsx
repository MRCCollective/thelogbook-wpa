import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, RefreshCw, X } from 'lucide-react'
import type { Html5Qrcode } from 'html5-qrcode'
import type { Activity, Member, Operation } from './data/types'

const cardPattern = /^[A-Za-z0-9]{9}p$/
const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function CheckInScanner({ activities, operations, members, onClose }: { activities: Activity[], operations: Operation[], members: Member[], onClose: () => void }) {
  const [activityId, setActivityId] = useState('')
  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'read'>('idle')
  const [message, setMessage] = useState('')
  const [cameras, setCameras] = useState<{ id: string, label: string }[]>([])
  const [cameraIndex, setCameraIndex] = useState(-1)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const mountedRef = useRef(true)
  const scanHandledRef = useRef(false)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const activeActivities = activities.filter(activity => activity.date <= today() && (activity.details?.endDate ?? activity.date) >= today())

  useEffect(() => {
    mountedRef.current = true
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeRef.current() }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      mountedRef.current = false
      window.removeEventListener('keydown', onKeyDown)
      const scanner = scannerRef.current
      scannerRef.current = null
      if (scanner) void scanner.stop().catch(() => {}).then(() => { try { scanner.clear() } catch { /* View is closing. */ } })
    }
  }, [])

  async function stopCamera() {
    const scanner = scannerRef.current
    scannerRef.current = null
    if (scanner) {
      try { await scanner.stop() } catch { /* Camera may still be starting. */ }
      try { await scanner.clear() } catch { /* The view is closing. */ }
    }
    if (mountedRef.current) setStatus('idle')
  }

  async function startCamera(deviceId?: string) {
    if (!activityId) { setMessage('Välj en aktivitet först.'); return }
    if (!window.isSecureContext) { setMessage('Kameran kräver HTTPS eller localhost.'); return }
    setMessage('')
    setStatus('starting')
    scanHandledRef.current = false
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      if (!mountedRef.current) return
      const scanner = new Html5Qrcode('checkin-qr-reader', { verbose: false })
      scannerRef.current = scanner
      const onScan = (value: string) => {
        if (scanHandledRef.current) return
        if (!cardPattern.test(value)) {
          setMessage('QR-koden är inte ett KEKS-incheckningskort. Försök igen.')
          return
        }
        scanHandledRef.current = true
        setStatus('read')
        const member = members.find(item => item.passId === value && !item.archived)
        setMessage(member ? `Demokort för ${member.name} avläst. ${member.consentStatus === 'given' ? 'Samtycke godkänt i demon.' : 'Samtycke är inte godkänt i demon.'} Ingen incheckning har registrerats i KEKS.` : 'Kortet är avläst, men finns inte i demomedlemslistan. Ingen incheckning har registrerats i KEKS.')
        void stopCamera().then(() => { if (mountedRef.current) setStatus('read') })
      }
      await scanner.start(deviceId ?? { facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScan, () => {})
      if (!mountedRef.current || scannerRef.current !== scanner) { await scanner.stop(); await scanner.clear(); return }
      if (scanHandledRef.current) return
      setStatus('scanning')
      try {
        const found = await Html5Qrcode.getCameras()
        if (mountedRef.current) {
          setCameras(found)
          setCameraIndex(found.findIndex(camera => camera.id === deviceId))
        }
      } catch { /* Switching cameras is optional. */ }
    } catch {
      if (mountedRef.current) {
        setStatus('idle')
        setMessage('Kameran kunde inte startas. Kontrollera behörigheten och försök igen.')
      }
      const scanner = scannerRef.current
      scannerRef.current = null
      if (scanner) try { await scanner.clear() } catch { /* Camera never started. */ }
    }
  }

  async function switchCamera() {
    if (cameras.length < 2) return
    const next = (cameraIndex + 1) % cameras.length
    await stopCamera()
    setCameraIndex(next)
    await startCamera(cameras[next].id)
  }

  const selectedActivity = activeActivities.find(activity => activity.id === activityId)
  const selectedOperation = operations.find(operation => operation.id === selectedActivity?.operationId)

  return <div className="sheet-backdrop scanner-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="activity-sheet scanner-sheet" role="dialog" aria-modal="true" aria-labelledby="scanner-title">
      <header className="sheet-header"><div><h2 id="scanner-title">Skanna incheckningskort</h2><p>Välj aktivitet och läs kortets QR-kod med kameran.</p></div><button className="icon-button" type="button" aria-label="Stäng" onClick={onClose}><X size={22} /></button></header>
      <div className="form-scroll scanner-content">
        <label htmlFor="checkin-activity">Aktivitet i dag</label>
        <select id="checkin-activity" value={activityId} onChange={event => { setActivityId(event.target.value); setMessage('') }} disabled={status === 'starting' || status === 'scanning'} autoFocus><option value="">Välj aktivitet</option>{activeActivities.map(activity => <option key={activity.id} value={activity.id}>{activity.title || operations.find(operation => operation.id === activity.operationId)?.name || 'Aktivitet'} · {activity.startTime}–{activity.endTime}</option>)}</select>
        {activeActivities.length === 0 && <p className="wizard-help">Det finns ingen aktivitet i dag att välja i demon.</p>}
        {selectedActivity && <p className="wizard-help">{selectedOperation?.name} · {selectedActivity.startTime}–{selectedActivity.endTime}</p>}
        <div className={`scanner-camera ${status === 'scanning' ? 'active' : ''}`}><div id="checkin-qr-reader" />{status !== 'scanning' && status !== 'starting' && <div className="scanner-placeholder"><Camera size={38} strokeWidth={1.5} /><span>Placera kortets QR-kod framför kameran</span></div>}{status === 'starting' && <div className="scanner-placeholder">Startar kamera…</div>}</div>
        {message && <p className={status === 'read' ? 'scanner-result' : 'form-error'} role="status">{message}</p>}
        <div className="scanner-actions">{status === 'idle' || status === 'read' ? <button className="button button-primary" type="button" onClick={() => void startCamera()} disabled={!activityId}><Camera size={18} /> {status === 'read' ? 'Skanna nästa kort' : 'Starta kamera'}</button> : <button className="button button-quiet" type="button" onClick={() => void stopCamera()}><CameraOff size={18} /> Stoppa kamera</button>}{status === 'scanning' && cameras.length > 1 && <button className="button button-quiet" type="button" onClick={() => void switchCamera()}><RefreshCw size={17} /> Byt kamera</button>}</div>
        <p className="form-demo-note">KEKS använder kort-ID:t för att kontrollera deltagaren, samtycke och tidigare incheckning på servern. Den här demon läser bara koden och skickar inget.</p>
      </div>
    </section>
  </div>
}
