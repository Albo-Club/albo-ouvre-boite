import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '~/components/ui/chart'
import { generateActivity } from '~/lib/mocks/activity'

export function ActivityChart() {
  const { t } = useTranslation(['dashboard', 'common'])
  const data = generateActivity(30)

  const config: ChartConfig = {
    items: { label: t('dashboard:activity.items'), color: 'var(--chart-1)' },
    events: { label: t('dashboard:activity.events'), color: 'var(--chart-2)' },
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{t('dashboard:activity.title')}</CardTitle>
        <CardDescription>
          {t('dashboard:activity.description', { count: 30 })}{' '}
          <span className="text-muted-foreground">· {t('common:demo')}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
          <AreaChart data={data} margin={{ left: 0, right: 12, top: 4 }}>
            <defs>
              <linearGradient id="fillItems" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-items)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-items)" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="fillEvents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-events)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-events)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(v) => {
                const d = new Date(v)
                return d.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              }}
            />
            <YAxis tickLine={false} axisLine={false} width={28} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(v) =>
                    new Date(v).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  }
                />
              }
            />
            <Area
              type="monotone"
              dataKey="items"
              stroke="var(--color-items)"
              fill="url(#fillItems)"
              strokeWidth={2}
              stackId="a"
            />
            <Area
              type="monotone"
              dataKey="events"
              stroke="var(--color-events)"
              fill="url(#fillEvents)"
              strokeWidth={2}
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
