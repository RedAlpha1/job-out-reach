import { useCallback, useState } from "react";
import type { ApplicationStatus, HistoryEntry } from "../types";

export interface NewHistoryEntry {
  company: string;
  role: string;
  status: ApplicationStatus;
  recipient: string;
  subject: string;
  body: string;
}

const HISTORY_KEY = "outreach_history";
const MAX_ENTRIES = 50;

function readHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function persist(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

let idCounter = 0;
function makeId(): string {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter}`;
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>(() => readHistory());

  /** Add a new entry (newest first), trimming to MAX_ENTRIES. Returns its id. */
  const addEntry = useCallback(
    (input: NewHistoryEntry): string => {
      const id = makeId();
      const entry: HistoryEntry = {
        id,
        date: new Date().toISOString(),
        company: input.company || "—",
        role: input.role || "—",
        status: input.status,
        recipient: input.recipient,
        subject: input.subject,
        body: input.body,
      };
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, MAX_ENTRIES);
        persist(next);
        return next;
      });
      return id;
    },
    [],
  );

  /** Promote an existing entry's status (e.g. Drafted -> Copied -> Sent). */
  const updateStatus = useCallback((id: string, status: ApplicationStatus) => {
    setHistory((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, status } : e));
      persist(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    persist([]);
  }, []);

  return { history, addEntry, updateStatus, clearHistory };
}
