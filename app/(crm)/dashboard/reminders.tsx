"use client"

import { useState } from "react"
import { Bell, X, Check } from "lucide-react"
import { Button } from "@/components/ui-crm/button"
import { formatDistanceToNow } from "date-fns"

interface Reminder {
  id: string
  lead_id: string
  note: string | null
  remind_at: string
  lead_name: string
  lead_company: string
}

export default function DashboardReminders({ reminders }: { reminders: Reminder[] }) {
  const [list, setList] = useState(reminders)

  async function markDone(reminder: Reminder) {
    setList((prev) => prev.filter((r) => r.id !== reminder.id))
    await fetch(`/api/leads/${reminder.lead_id}/reminder`, { method: "DELETE" })
  }

  if (list.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/10 p-4">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
          <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-2">
            {list.length} follow-up reminder{list.length > 1 ? "s" : ""} due
          </p>
          <div className="space-y-2">
            {list.map((r) => (
              <div key={r.id} className="flex items-center gap-3 bg-white dark:bg-amber-900/20 rounded-md px-3 py-2 border border-amber-100 dark:border-amber-800/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {r.lead_name}
                    {r.lead_company && <span className="text-muted-foreground font-normal"> · {r.lead_company}</span>}
                  </p>
                  {r.note && <p className="text-xs text-muted-foreground truncate">{r.note}</p>}
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    {new Date(r.remind_at) < new Date()
                      ? `Overdue — ${formatDistanceToNow(new Date(r.remind_at))} ago`
                      : `Due ${formatDistanceToNow(new Date(r.remind_at), { addSuffix: true })}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-7 text-xs gap-1 border-amber-200 dark:border-amber-700"
                  onClick={() => markDone(r)}
                >
                  <Check className="h-3 w-3" />
                  Done
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
