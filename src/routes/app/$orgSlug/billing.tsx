import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Check, CreditCard, Download, Plus, Sparkles } from 'lucide-react'

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
  usage,
  type InvoiceStatus,
} from '~/lib/mocks/billing'

export const Route = createFileRoute('/app/$orgSlug/billing')({
  component: BillingPage,
  head: () => ({ meta: [{ title: 'Billing — albo' }] }),
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
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
  const [addCardOpen, setAddCardOpen] = useState(false)

  return (
    <main className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground text-sm">
          Manage your plan, invoices, and payment methods.
        </p>
      </div>

      <Alert>
        <Sparkles className="size-4" />
        <AlertTitle>Demo data</AlertTitle>
        <AlertDescription>
          This page renders mock billing data — wire it to Stripe, LemonSqueezy,
          or your provider of choice.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="methods">Payment methods</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Current plan</CardTitle>
                <CardDescription>Billed monthly</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold">
                    ${currentPlan.price}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    /{currentPlan.interval}
                  </span>
                </div>
                <div>
                  <Badge variant="default">{currentPlan.name}</Badge>
                </div>
                <div className="text-muted-foreground text-sm">
                  {currentPlan.seatsUsed} / {currentPlan.seats} seats used
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Change plan
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Next invoice</CardTitle>
                <CardDescription>
                  Auto-charged to your default card
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-semibold">
                  ${currentPlan.nextInvoiceAmount}
                </div>
                <div className="text-muted-foreground text-sm">
                  Scheduled for {formatDate(currentPlan.nextInvoiceDate)}
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  View details
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage</CardTitle>
                <CardDescription>This billing cycle</CardDescription>
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
              <CardTitle>Invoices</CardTitle>
              <CardDescription>
                {invoices.length} invoices on file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
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
                          <Badge
                            variant={STATUS_VARIANT[inv.status]}
                            className="capitalize"
                          >
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label="Download invoice"
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
                <CardTitle>Payment methods</CardTitle>
                <CardDescription>
                  Cards linked to this organization
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setAddCardOpen(true)}>
                <Plus className="mr-1.5 size-4" />
                Add card
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
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Expires {String(pm.expMonth).padStart(2, '0')}/
                      {pm.expYear}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Edit
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
            <DialogTitle>Add payment method</DialogTitle>
            <DialogDescription>
              Connect Stripe Elements or LemonSqueezy here. This dialog is a
              demo placeholder.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCardOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setAddCardOpen(false)}>Save card</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
