export type ActivityPhoto = {
  id: string
  activityId: string
  name: string
  addedAt: number
  blob: Blob
}

const databaseName = 'thelogbook-demo-photos'
const storeName = 'photos'

function openPhotos(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      const store = database.createObjectStore(storeName, { keyPath: 'id' })
      store.createIndex('activityId', 'activityId')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function useStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openPhotos()
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode)
    const request = run(transaction.objectStore(storeName))
    transaction.oncomplete = () => { database.close(); resolve(request.result) }
    transaction.onerror = () => { database.close(); reject(transaction.error) }
    transaction.onabort = () => { database.close(); reject(transaction.error) }
  })
}

export async function getActivityPhotos(activityId: string): Promise<ActivityPhoto[]> {
  const photos = await useStore<ActivityPhoto[]>('readonly', store => store.index('activityId').getAll(activityId))
  return photos.sort((a, b) => a.addedAt - b.addedAt)
}

export async function addActivityPhoto(activityId: string, file: File): Promise<void> {
  const photo: ActivityPhoto = { id: crypto.randomUUID(), activityId, name: file.name, addedAt: Date.now(), blob: file }
  await useStore<IDBValidKey>('readwrite', store => store.add(photo))
}

export async function removeActivityPhoto(id: string): Promise<void> {
  await useStore<undefined>('readwrite', store => store.delete(id))
}
