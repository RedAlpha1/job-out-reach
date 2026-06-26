import { useState } from "react";
import { ChevronDown, History as HistoryIcon, SquarePen, Trash2 } from "lucide-react";
import type { HistoryEntry } from "../types";

interface Props {
  history: HistoryEntry[];
  onClear: () => void;
  onSelect: (entry: HistoryEntry) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function History({ history, onClear, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  if (history.length === 0) return null;

  const canReopen = (e: HistoryEntry) => e.subject != null && e.body != null;

  return (
    <section className="history">
      <button className="history__toggle" onClick={() => setOpen((o) => !o)}>
        <HistoryIcon size={15} />
        <span>
          Application history <span className="muted">({history.length})</span>
        </span>
        <ChevronDown size={16} className={`chevron${open ? " chevron--open" : ""}`} />
      </button>

      {open && (
        <div className="history__body">
          <table className="history__table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Company</th>
                <th>Role</th>
                <th>Status</th>
                <th aria-label="Reopen" />
              </tr>
            </thead>
            <tbody>
              {history.map((e) => {
                const reopen = canReopen(e);
                return (
                  <tr
                    key={e.id}
                    className={reopen ? "history__row history__row--open" : "history__row"}
                    onClick={reopen ? () => onSelect(e) : undefined}
                    title={reopen ? "Reopen this draft in the editor" : undefined}
                  >
                    <td className="muted">{formatDate(e.date)}</td>
                    <td>{e.company}</td>
                    <td className="muted">{e.role}</td>
                    <td>
                      <span className={`status status--${e.status.toLowerCase()}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="history__open-cell">
                      {reopen && <SquarePen size={14} className="history__open-icon" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button className="link-btn" onClick={onClear}>
            <Trash2 size={13} /> Clear history
          </button>
        </div>
      )}
    </section>
  );
}
