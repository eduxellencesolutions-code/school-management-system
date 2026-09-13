import AsyncStorage from '@react-native-async-storage/async-storage'
import { submitAttendance } from '../supabase/queries/attendance'

const QUEUE_KEY = 'offline_queue:attendance'

export interface QueuedAttendance {
  id: string // local id, for removal after sync
  organizationId: string
  groupId: string
  groupName: string
  termId: string
  sessionId: string
  date: string
  entries: { learnerId: string; status: 'present' | 'absent' | 'late' }[]
  queuedAt: string
}

async function readQueue(): Promise<QueuedAttendance[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY)
  return raw ? JSON.parse(raw) : []
}

async function writeQueue(queue: QueuedAttendance[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export async function enqueueAttendance(item: Omit<QueuedAttendance, 'id' | 'queuedAt'>): Promise<void> {
  const queue = await readQueue()
  queue.push({ ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, queuedAt: new Date().toISOString() })
  await writeQueue(queue)
}

export async function getQueuedAttendance(): Promise<QueuedAttendance[]> {
  return readQueue()
}

// Attempts to submit every queued item. Successes are removed; failures
// (e.g. still offline, or a real server error) stay queued for the next attempt.
// Returns counts so calling UI can show a result without needing to inspect the queue itself.
export async function processAttendanceQueue(): Promise<{ synced: number; failed: number }> {
  const queue = await readQueue()
  if (queue.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  const remaining: QueuedAttendance[] = []

  for (const item of queue) {
    try {
      await submitAttendance({
        organizationId: item.organizationId, groupId: item.groupId, termId: item.termId,
        sessionId: item.sessionId, date: item.date, entries: item.entries,
      })
      synced++
    } catch {
      remaining.push(item) // still failing (offline or real error) — keep for next attempt
    }
  }

  await writeQueue(remaining)
  return { synced, failed: remaining.length }
}