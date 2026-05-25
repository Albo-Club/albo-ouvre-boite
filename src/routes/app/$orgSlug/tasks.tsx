import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Sparkles,
  User,
} from 'lucide-react'

import type {Task, TaskStatus} from '~/lib/mocks/tasks';
import { getI18n } from '~/lib/i18n'
import { getLocale } from '~/lib/locale'
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
  
  
  initialTasks
} from '~/lib/mocks/tasks'

export const Route = createFileRoute('/app/$orgSlug/tasks')({
  component: TasksPage,
  head: () => ({
    meta: [
      { title: getI18n(getLocale()).getFixedT(null, 'org')('tasks.metaTitle') },
    ],
  }),
})

const STATUS_ORDER: Array<TaskStatus> = ['todo', 'in_progress', 'done']

function nextStatus(s: TaskStatus, dir: 1 | -1): TaskStatus | null {
  const idx = STATUS_ORDER.indexOf(s)
  const target = idx + dir
  if (target < 0 || target >= STATUS_ORDER.length) return null
  return STATUS_ORDER[target]
}

function TasksPage() {
  const { t } = useTranslation(['org'])
  const [tasks, setTasks] = useState<Array<Task>>(initialTasks)

  function dueLabel(offset: number) {
    if (offset === 0) return t('org:tasks.due.today')
    if (offset === 1) return t('org:tasks.due.tomorrow')
    if (offset === -1) return t('org:tasks.due.yesterday')
    if (offset > 0) return t('org:tasks.due.inDays', { count: offset })
    return t('org:tasks.due.daysAgo', { count: Math.abs(offset) })
  }

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
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('org:tasks.title')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t('org:tasks.subtitle')}
        </p>
      </div>

      <Alert>
        <Sparkles className="size-4" />
        <AlertTitle>{t('org:tasks.demoTitle')}</AlertTitle>
        <AlertDescription>{t('org:tasks.demoDescription')}</AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((task) => task.status === col.id)
          return (
            <Card key={col.id} className="bg-muted/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">
                  {t(`org:tasks.columns.${col.id}`)}
                </CardTitle>
                <Badge variant="secondary">{columnTasks.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {columnTasks.length === 0 ? (
                  <p className="text-muted-foreground py-6 text-center text-xs">
                    {t('org:tasks.empty')}
                  </p>
                ) : (
                  columnTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-background space-y-2 rounded-md border p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium leading-snug">
                          {task.title}
                        </h3>
                        <Badge
                          variant={PRIORITY_VARIANT[task.priority]}
                          className="shrink-0"
                        >
                          {t(`org:tasks.priority.${task.priority}`)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {task.description}
                      </p>
                      <div className="text-muted-foreground flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <User className="size-3" />
                          {task.assignee}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3" />
                          {dueLabel(task.dueOffset)}
                        </span>
                      </div>
                      <div className="flex justify-end gap-1 pt-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => move(task.id, -1)}
                          disabled={!nextStatus(task.status, -1)}
                          aria-label={t('org:tasks.moveLeft')}
                        >
                          <ArrowLeft className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => move(task.id, 1)}
                          disabled={!nextStatus(task.status, 1)}
                          aria-label={t('org:tasks.moveRight')}
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
