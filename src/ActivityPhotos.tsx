import { useEffect, useState, type ChangeEvent } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { addActivityPhoto, getActivityPhotos, removeActivityPhoto } from './data/photos'

type Preview = { id: string, name: string, url: string }
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const maxPhotos = 12
const maxBytes = 10 * 1024 * 1024

export default function ActivityPhotos({ activityId }: { activityId: string }) {
  const [photos, setPhotos] = useState<Preview[]>([])
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let disposed = false
    let urls: string[] = []
    setPhotos([])
    void getActivityPhotos(activityId).then(items => {
      if (disposed) return
      const next = items.map(item => ({ id: item.id, name: item.name, url: URL.createObjectURL(item.blob) }))
      urls = next.map(item => item.url)
      setPhotos(next)
    }).catch(() => { if (!disposed) setMessage('Bilderna kunde inte läsas från den här webbläsaren.') })
    return () => { disposed = true; urls.forEach(URL.revokeObjectURL) }
  }, [activityId, revision])

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    if (files.some(file => !allowedTypes.has(file.type) || file.size > maxBytes)) { setMessage('Välj JPG, PNG, WebP eller AVIF, högst 10 MB per bild.'); return }
    setBusy(true)
    setMessage('')
    try {
      const existing = await getActivityPhotos(activityId)
      if (existing.length + files.length > maxPhotos) {
        setMessage(`Du kan ha högst ${maxPhotos} bilder per aktivitet i demon.`)
        return
      }
      for (const file of files) await addActivityPhoto(activityId, file)
      setRevision(value => value + 1)
      setMessage(files.length === 1 ? 'Bilden sparades i den här webbläsaren.' : `${files.length} bilder sparades i den här webbläsaren.`)
    } catch {
      setRevision(value => value + 1)
      setMessage('Alla bilder kunde inte sparas. Kontrollera webbläsarens lagringsutrymme.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Ta bort bilden från den här demon?')) return
    setBusy(true)
    setMessage('')
    try {
      await removeActivityPhoto(id)
      setRevision(value => value + 1)
    } catch {
      setMessage('Bilden kunde inte tas bort just nu.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="detail-section activity-photos">
    <div className="activity-photos-heading"><div><h3>Bilder från kvällen</h3><p>Bilderna sparas bara i den här webbläsaren och delas inte automatiskt.</p></div><label className={`button button-quiet photo-upload ${busy || photos.length >= maxPhotos ? 'disabled' : ''}`}><ImagePlus size={18} /> Lägg till bilder<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={busy || photos.length >= maxPhotos} onChange={event => void upload(event)} /></label></div>
    {photos.length > 0 ? <div className="activity-photo-grid">{photos.map(photo => <div className="activity-photo" key={photo.id}><a href={photo.url} target="_blank" rel="noopener noreferrer" aria-label={`Visa ${photo.name} i full storlek`}><img src={photo.url} alt={photo.name} loading="lazy" /></a><button type="button" aria-label={`Ta bort ${photo.name}`} title="Ta bort bild" disabled={busy} onClick={() => void remove(photo.id)}><Trash2 size={16} /></button></div>)}</div> : <p className="activity-photo-empty">Inga bilder har lagts till för den här aktiviteten än.</p>}
    {message && <p className="activity-photo-message" role="status">{message}</p>}
  </section>
}
