import { useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw, X } from 'lucide-react'
import type { Html5Qrcode } from 'html5-qrcode'
import type { Activity, Member, Operation } from './data/types'

const cardPattern = /^[A-Za-z0-9]{9}p$/
const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function CheckInScanner({ activities, operations, members, onClose }: { activities: Activity[], operations: Operation[], members: Member[], onClose: () => void }) {
  const [activityId, setActivityId] = useState('')
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(false)
  const [cameras, setCameras] = useState<{ id: string, label: string }[]>([])
  const [cameraIndex, setCameraIndex] = useState(-1)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const mountedRef = useRef(true)
  const lastScanRef = useRef<{ value: string, time: number } | null>(null)
  const activityIdRef = useRef(activityId)
  const startIdRef = useRef(0)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  activityIdRef.current = activityId
  const activeActivities = activities.filter(activity => activity.date <= today() && (activity.details?.endDate ?? activity.date) >= today())

  useEffect(() => {
    mountedRef.current = true
    void startCamera()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeRef.current() }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      mountedRef.current = false
      startIdRef.current++
      window.removeEventListener('keydown', onKeyDown)
      const scanner = scannerRef.current
      scannerRef.current = null
      if (scanner) void scanner.stop().catch(() => {}).then(() => { try { scanner.clear() } catch { /* View is closing. */ } })
    }
  }, [])

  async function stopCamera() {
    startIdRef.current++
    const scanner = scannerRef.current
    scannerRef.current = null
    if (scanner) {
      try { await scanner.stop() } catch { /* Camera may still be starting. */ }
      try { await scanner.clear() } catch { /* The view is closing. */ }
    }
  }

  async function startCamera(deviceId?: string) {
    const startId = ++startIdRef.current
    if (!window.isSecureContext) { setStatus('error'); setMessage('Kameran kräver HTTPS eller localhost.'); return }
    setMessage('')
    setResult(false)
    setStatus('starting')
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      if (!mountedRef.current || startId !== startIdRef.current) return
      const scanner = new Html5Qrcode('checkin-qr-reader', { verbose: false })
      scannerRef.current = scanner
      const onScan = (value: string) => {
        if (!mountedRef.current || startId !== startIdRef.current) return
        const now = Date.now()
        if (lastScanRef.current?.value === value && now - lastScanRef.current.time < 5000) return
        lastScanRef.current = { value, time: now }
        if (!cardPattern.test(value)) {
          setMessage('QR-koden är inte ett KEKS-incheckningskort. Försök igen.')
          setResult(false)
          return
        }
        if (!activityIdRef.current) {
          setMessage('Välj en aktivitet för att se kortresultatet.')
          setResult(false)
          return
        }
        const member = members.find(item => item.passId === value && !item.archived)
        setMessage(member ? `Demokort för ${member.name} avläst. ${member.consentStatus === 'given' ? 'Samtycke godkänt i demon.' : 'Samtycke är inte godkänt i demon.'} Ingen incheckning har registrerats i KEKS.` : 'Kortet är avläst, men finns inte i demomedlemslistan. Ingen incheckning har registrerats i KEKS.')
        setResult(true)
      }
      await scanner.start(deviceId ?? { facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } }, onScan, () => {})
      if (!mountedRef.current || startId !== startIdRef.current || scannerRef.current !== scanner) { await scanner.stop(); await scanner.clear(); return }
      setStatus('scanning')
      try {
        const found = await Html5Qrcode.getCameras()
        if (mountedRef.current && startId === startIdRef.current) {
          setCameras(found)
          setCameraIndex(found.findIndex(camera => camera.id === deviceId))
        }
      } catch { /* Switching cameras is optional. */ }
    } catch {
      if (mountedRef.current && startId === startIdRef.current) {
        setStatus('error')
        setMessage('Kameran kunde inte startas. Kontrollera behörigheten och försök igen.')
      }
      if (startId === startIdRef.current) {
        const scanner = scannerRef.current
        scannerRef.current = null
        if (scanner) try { await scanner.clear() } catch { /* Camera never started. */ }
      }
    }
  }

  async function switchCamera() {
    if (cameras.length < 2) return
    const next = (cameraIndex + 1) % cameras.length
    await stopCamera()
    if (!mountedRef.current) return
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
        <select id="checkin-activity" value={activityId} onChange={event => { setActivityId(event.target.value); setMessage(''); setResult(false) }} autoFocus><option value="">Välj aktivitet</option>{activeActivities.map(activity => <option key={activity.id} value={activity.id}>{activity.title || operations.find(operation => operation.id === activity.operationId)?.name || 'Aktivitet'} · {activity.startTime}–{activity.endTime}</option>)}</select>
        {activeActivities.length === 0 && <p className="wizard-help">Det finns ingen aktivitet i dag att välja i demon.</p>}
        {selectedActivity && <p className="wizard-help">{selectedOperation?.name} · {selectedActivity.startTime}–{selectedActivity.endTime}</p>}
        <div className={`scanner-camera ${status === 'scanning' ? 'active' : ''}`}><div id="checkin-qr-reader" />{status === 'error' && <div className="scanner-placeholder"><Camera size={38} strokeWidth={1.5} /><span>Kameran är inte tillgänglig</span></div>}{status === 'starting' && <div className="scanner-placeholder">Startar kamera…</div>}</div>
        {message && <p className={result ? 'scanner-result' : 'form-error'} role="status">{message}</p>}
        <div className="scanner-actions">{status === 'error' && <button className="button button-quiet" type="button" onClick={() => void startCamera()}><RefreshCw size={17} /> Försök igen</button>}{status === 'scanning' && cameras.length > 1 && <button className="button button-quiet" type="button" onClick={() => void switchCamera()}><RefreshCw size={17} /> Byt kamera</button>}</div>
        <p className="form-demo-note">KEKS använder kort-ID:t för att kontrollera deltagaren, samtycke och tidigare incheckning på servern. Den här demon läser bara koden och skickar inget.</p>
      </div>
    </section>
  </div>
}
