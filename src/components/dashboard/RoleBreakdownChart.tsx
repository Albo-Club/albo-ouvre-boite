import { Cell, Pie, PieChart } from 'recharts'
import { useTranslation } from 'react-i18next'

import type {ChartConfig} from '~/components/ui/chart';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '~/components/ui/chart'

type Member = { role: string }

export function RoleBreakdownChart({
  members,
}: {
  members: Array<Member> | undefined
}) {
  const { t } = useTranslation(['dashboard', 'common'])
  const config: ChartConfig = {
    count: { label: t('dashboard:roles.membersLegend') },
    owner: { label: t('common:roles.owner'), color: 'var(--chart-1)' },
    admin: { label: t('common:roles.admin'), color: 'var(--chart-2)' },
    member: { label: t('common:roles.member'), color: 'var(--chart-3)' },
  }
  const counts = (members ?? []).reduce<Record<string, number | undefined>>(
    (acc, m) => {
      acc[m.role] = (acc[m.role] ?? 0) + 1
      return acc
    },
    {},
  )
  const data = [
    { role: 'owner', count: counts.owner ?? 0, fill: 'var(--chart-1)' },
    { role: 'admin', count: counts.admin ?? 0, fill: 'var(--chart-2)' },
    { role: 'member', count: counts.member ?? 0, fill: 'var(--chart-3)' },
  ].filter((d) => d.count > 0)
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{t('dashboard:roles.title')}</CardTitle>
        <CardDescription>{t('dashboard:roles.total', { count: total })}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {data.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            {t('dashboard:roles.none')}
          </p>
        ) : (
          <ChartContainer
            config={config}
            className="mx-auto aspect-square h-[220px]"
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={data}
                dataKey="count"
                nameKey="role"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.role} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
