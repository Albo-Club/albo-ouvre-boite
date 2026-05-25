import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Check, CreditCard, Download, Plus, Sparkles } from 'lucide-react'

import type {InvoiceStatus} from '~/lib/mocks/billing';
import { getI18n } from '~/lib/i18n'
import { getLocale } from '~/lib/locale'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Progress } from '~/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import {
  
  currentPlan,
  invoices,
  paymentMethods,
  usage
} from '~/lib/mocks/billing'

export const Route = createFileRoute('/app/$orgSlug/billing')({
  component: BillingPage,
  head: () => ({
    meta: [
      {
        title: getI18n(getLocale()).getFixedT(null, 'org')('billing.metaTitle'),
      },
    ],
  }),
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(getLocale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const STATUS_VARIANT: Record<InvoiceStatus, 'default' | 'secondary' | 'destructive'> = {
  paid: 'default',
  pending: 'secondary',
  failed: 'destructive',
}

function BillingPage() {
  const { t } = useTranslation(['org', 'common'])
  const [addCardOpen, setAddCardOpen] = useState(false)

  return (
    <main className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('org:billing.title')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t('org:billing.subtitle')}
        </p>
      </div>

      <Alert>
        <Sparkles className="size-4" />
        <AlertTitle>{t('org:billing.demoTitle')}</AlertTitle>
        <AlertDescription>{t('org:billing.demoDescription')}</AlertDescription>
      </Alert>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            {t('org:billing.tabs.overview')}
          </TabsTrigger>
          <TabsTrigger value="invoices">
            {t('org:billing.tabs.invoices')}
          </TabsTrigger>
          <TabsTrigger value="methods">
            {t('org:billing.tabs.methods')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t('org:billing.currentPlan')}</CardTitle>
                <CardDescription>{t('org:billing.billedMonthly')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold">
                    ${currentPlan.price}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {t('org:billing.perInterval', {
                      interval: t(`org:billing.interval.${currentPlan.interval}`),
                    })}
                  </span>
                </div>
                <div>
                  <Badge variant="default">{currentPlan.name}</Badge>
                </div>
                <div className="text-muted-foreground text-sm">
                  {t('org:billing.seatsUsed', {
                    used: currentPlan.seatsUsed,
                    total: currentPlan.seats,
                  })}
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  {t('org:billing.changePlan')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('org:billing.nextInvoice')}</CardTitle>
                <CardDescription>
                  {t('org:billing.autoCharged')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-semibold">
                  ${currentPlan.nextInvoiceAmount}
                </div>
                <div className="text-muted-foreground text-sm">
                  {t('org:billing.scheduledFor', {
                    date: formatDate(currentPlan.nextInvoiceDate),
                  })}
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  {t('org:billing.viewDetails')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('org:billing.usage')}</CardTitle>
                <CardDescription>{t('org:billing.thisCycle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {usage.map((u) => {
                  const pct = Math.min(
                    100,
                    Math.round((u.used / u.included) * 100),
                  )
                  return (
                    <div key={u.label} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span>{u.label}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {u.used.toLocaleString()} /{' '}
                          {u.included.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={pct} />
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>{t('org:billing.tabs.invoices')}</CardTitle>
              <CardDescription>
                {t('org:billing.invoicesOnFile', { count: invoices.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('org:billing.table.number')}</TableHead>
                      <TableHead>{t('org:billing.table.date')}</TableHead>
                      <TableHead>{t('org:billing.table.description')}</TableHead>
                      <TableHead className="text-right">
                        {t('org:billing.table.amount')}
                      </TableHead>
                      <TableHead>{t('org:billing.table.status')}</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs">
                          {inv.number}
                        </TableCell>
                        <TableCell>{formatDate(inv.date)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {inv.pdfHint}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          ${inv.amount}.00
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[inv.status]}>
                            {t(`org:billing.invoiceStatus.${inv.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={t('org:billing.downloadInvoice')}
                          >
                            <Download className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>{t('org:billing.tabs.methods')}</CardTitle>
                <CardDescription>
                  {t('org:billing.cardsLinked')}
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setAddCardOpen(true)}>
                <Plus className="mr-1.5 size-4" />
                {t('org:billing.addCard')}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center gap-4 rounded-md border p-4"
                >
                  <div className="bg-muted flex size-10 items-center justify-center rounded">
                    <CreditCard className="size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">
                        {pm.brand}
                      </span>
                      <span className="text-muted-foreground">
                        •••• {pm.last4}
                      </span>
                      {pm.isDefault && (
                        <Badge variant="secondary">
                          <Check className="mr-1 size-3" />
                          {t('org:billing.default')}
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {t('org:billing.expires', {
                        month: String(pm.expMonth).padStart(2, '0'),
                        year: pm.expYear,
                      })}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    {t('common:actions.edit')}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={addCardOpen}
        onOpenChange={(o) => !o && setAddCardOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('org:billing.addCardTitle')}</DialogTitle>
            <DialogDescription>
              {t('org:billing.addCardDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCardOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={() => setAddCardOpen(false)}>
              {t('org:billing.saveCard')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
