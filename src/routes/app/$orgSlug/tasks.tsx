import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Sparkles,
  User,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  COLUMNS,
  PRIORITY_VARIANT,
  initialTasks,
  type Task,
  type TaskStatus,
} from '~/lib/mocks/tasks'

export const Route = createFileRoute('/app/$orgSlug/tasks')({
  component: TasksPage,
  head: () => ({ meta: [{ title: 'Tasks — albo' }] }),
})

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done']

function nextStatus(s: TaskStatus, dir: 1 | -1): TaskStatus | null {
  const idx = STATUS_ORDER.indexOf(s)
  const target = idx + dir
  if (target < 0 || target >= STATUS_ORDER.length) return null
  return STATUS_ORDER[target]
}

function dueLabel(offset: number) {
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Tomorrow'
  if (offset === -1) return 'Yesterday'
  if (offset > 0) return `in ${offset}d`
  return `${Math.abs(offset)}d ago`
}

function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)

  function move(id: string, dir: 1 | -1) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const next = nextStatus(t.status, dir)
        return next ? { ...t, status: next } : t
      }),
    )
  }

  return (
    <main className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground text-sm">
          Move cards between columns with the arrow buttons.
        </p>
      </div>

      <Alert>
        <Sparkles className="size-4" />
        <AlertTitle>Demo data</AlertTitle>
        <AlertDescription>
          Local-state kanban board with mock tasks. Plug it into a Convex
          `tasks` table for persistence.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.id)
          return (
            <Card key={col.id} className="bg-muted/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">
                  {col.label}
                </CardTitle>
                <Badge variant="secondary">{columnTasks.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {columnTasks.length === 0 ? (
                  <p className="text-muted-foreground py-6 text-center text-xs">
                    No tasks
                  </p>
                ) : (
                  columnTasks.map((t) => (
                    <div
                      key={t.id}
                      className="bg-background space-y-2 rounded-md border p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium leading-snug">
                          {t.title}
                        </h3>
                        <Badge
                          variant={PRIORITY_VARIANT[t.priority]}
                          className="shrink-0 capitalize"
                        >
                          {t.priority}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {t.description}
                      </p>
                      <div className="text-muted-foreground flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <User className="size-3" />
                          {t.assignee}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3" />
                          {dueLabel(t.dueOffset)}
                        </span>
                      </div>
                      <div className="flex justify-end gap-1 pt-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => move(t.id, -1)}
                          disabled={!nextStatus(t.status, -1)}
                          aria-label="Move left"
                        >
                          <ArrowLeft className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => move(t.id, 1)}
                          disabled={!nextStatus(t.status, 1)}
                          aria-label="Move right"
                        >
                          <ArrowRight className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </main>
  )
}
