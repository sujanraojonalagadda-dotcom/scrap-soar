import { createPickup, type CreatePickupInput } from "@/lib/services/transactionService";

const QUEUE_PREFIX = "kc:pickup-queue:";
const DRAFT_PREFIX = "kc:pickup-draft:";
const RECYCLERS_KEY = "kc:recyclers";

export interface PickupDraft {
  category: string;
  weight: string;
  condition: string;
  recyclerId: string | null;
}

export interface QueuedPickup extends CreatePickupInput {
  queuedAt: string;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}

export function readPickupDraft(userId: string): PickupDraft | null {
  return readJson<PickupDraft | null>(`${DRAFT_PREFIX}${userId}`, null);
}

export function savePickupDraft(userId: string, draft: PickupDraft) {
  window.localStorage.setItem(`${DRAFT_PREFIX}${userId}`, JSON.stringify(draft));
}

export function clearPickupDraft(userId: string) {
  window.localStorage.removeItem(`${DRAFT_PREFIX}${userId}`);
}

export function listQueuedPickups(userId: string): QueuedPickup[] {
  return readJson<QueuedPickup[]>(`${QUEUE_PREFIX}${userId}`, []);
}

export function queuePickup(input: CreatePickupInput): QueuedPickup {
  const queued = { ...input, queuedAt: new Date().toISOString() };
  const items = listQueuedPickups(input.collectorId);
  if (!items.some((item) => item.id === queued.id)) items.push(queued);
  window.localStorage.setItem(`${QUEUE_PREFIX}${input.collectorId}`, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("kc:queue-changed"));
  return queued;
}

export async function syncQueuedPickups(userId: string): Promise<number> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;
  const queued = listQueuedPickups(userId);
  let synced = 0;
  const remaining = [...queued];
  for (const item of queued) {
    try {
      await createPickup(item);
      remaining.shift();
      synced += 1;
      window.localStorage.setItem(`${QUEUE_PREFIX}${userId}`, JSON.stringify(remaining));
    } catch {
      break;
    }
  }
  if (synced > 0) window.dispatchEvent(new CustomEvent("kc:queue-synced"));
  return synced;
}

export function cacheRecyclers<T>(recyclers: T[]) {
  window.localStorage.setItem(RECYCLERS_KEY, JSON.stringify(recyclers));
}

export function readCachedRecyclers<T>(): T[] {
  return readJson<T[]>(RECYCLERS_KEY, []);
}