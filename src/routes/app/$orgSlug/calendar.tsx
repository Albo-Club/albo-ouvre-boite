import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Clock, Sparkles, Users } from 'lucide-react'
import { isSameDay } from 'date-fns'

import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Calendar } from '~/components/ui/calendar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { events, eventTypeLabel, type CalendarEvent } from '~/lib/mocks/calendar'

export const Route = createFileRoute('/app/$orgSlug/calendar')({
  component: CalendarPage,
  head: () => ({ meta: [{ title: 'Calendar — albo' }] }),
})

function dateFor(offset: number) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d
}

function formatTime(h: number, m: number) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const TYPE_COLOR: Record<CalendarEvent['type'], string> = {
  meeting: 'bg-blue-500',
  review: 'bg-amber-500',
  focus: 'bg-emerald-500',
  demo: 'bg-violet-500',
}

function CalendarPage() {
  const [selected, setSelected] = useState<Date | undefined>(new Date())

  const eventDates = useMemo(
    () => events.map((e) => dateFor(e.dateOffset)),
    [],
  )

  const dayEvents = useMemo(() => {
    if (!selected) return []
    return events
      .filter((e) => isSameDay(dateFor(e.dateOffset), selected))
      .sort((a, b) => a.hour * 60 + a.minutes - (b.hour * 60 + b.minutes))
  }, [selected])

  return (
    <main className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground text-sm">
          Pick a date to view its events.
        </p>
      </div>

      <Alert>
        <Sparkles className="size-4" />
        <AlertTitle>Demo data</AlertTitle>
        <AlertDescription>
          These events are mock data — connect Google Calendar, Outlook, or
          your own events table.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <Card>
          <CardContent className="p-3">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={setSelected}
              modifiers={{ hasEvent: eventDates }}
              modifiersClassNames={{
                hasEvent:
                  "relative after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary",
              }}
              className="rounded-md"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selected
                ? selected.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'No date'}
            </CardTitle>
            <CardDescription>
              {dayEvents.length} event{dayEvents.length === 1 ? '' : 's'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dayEvents.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Nothing scheduled for this day.
              </p>
            ) : (
              <ul className="space-y-3">
                {dayEvents.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 rounded-md border p-3"
                  >
                    <span
                      className={`mt-1.5 inline-block size-2 shrink-0 rounded-full ${TYPE_COLOR[e.type]}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-medium">{e.title}</h3>
                        <Badge variant="outline">{eventTypeLabel(e.type)}</Badge>
                      </div>
                      <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatTime(e.hour, e.minutes)} ·{' '}
                          {e.durationMin} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          {e.attendees.join(', ')}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
