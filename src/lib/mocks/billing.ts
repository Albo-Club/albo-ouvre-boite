// demo data only — not connected to Convex or Stripe

export type InvoiceStatus = 'paid' | 'pending' | 'failed'

export type Invoice = {
  id: string
  number: string
  date: string
  amount: number
  status: InvoiceStatus
  pdfHint: string
}

export type PaymentMethod = {
  id: string
  brand: 'visa' | 'mastercard' | 'amex'
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
}

export const currentPlan = {
  name: 'Pro',
  price: 49,
  interval: 'month' as const,
  seats: 10,
  seatsUsed: 7,
  nextInvoiceAmount: 49,
  nextInvoiceDate: '2026-06-12',
}

export const usage = [
  { label: 'Listings actifs', used: 142, included: 200 },
  { label: 'Visites planifiées (mois)', used: 87, included: 500 },
  { label: 'Photos & docs (GB)', used: 4.2, included: 20 },
]

export const invoices: Array<Invoice> = [
  {
    id: 'inv_010',
    number: 'INV-2026-010',
    date: '2026-05-12',
    amount: 49,
    status: 'paid',
    pdfHint: 'Pro plan · May 2026',
  },
  {
    id: 'inv_009',
    number: 'INV-2026-009',
    date: '2026-04-12',
    amount: 49,
    status: 'paid',
    pdfHint: 'Pro plan · April 2026',
  },
  {
    id: 'inv_008',
    number: 'INV-2026-008',
    date: '2026-03-12',
    amount: 49,
    status: 'paid',
    pdfHint: 'Pro plan · March 2026',
  },
  {
    id: 'inv_007',
    number: 'INV-2026-007',
    date: '2026-02-12',
    amount: 39,
    status: 'paid',
    pdfHint: 'Starter plan · February 2026',
  },
  {
    id: 'inv_006',
    number: 'INV-2026-006',
    date: '2026-01-12',
    amount: 39,
    status: 'failed',
    pdfHint: 'Starter plan · January 2026 (retry)',
  },
  {
    id: 'inv_005',
    number: 'INV-2025-005',
    date: '2025-12-12',
    amount: 39,
    status: 'paid',
    pdfHint: 'Starter plan · December 2025',
  },
  {
    id: 'inv_004',
    number: 'INV-2025-004',
    date: '2025-11-12',
    amount: 39,
    status: 'pending',
    pdfHint: 'Starter plan · November 2025',
  },
  {
    id: 'inv_003',
    number: 'INV-2025-003',
    date: '2025-10-12',
    amount: 39,
    status: 'paid',
    pdfHint: 'Starter plan · October 2025',
  },
]

export const paymentMethods: Array<PaymentMethod> = [
  {
    id: 'pm_visa',
    brand: 'visa',
    last4: '4242',
    expMonth: 8,
    expYear: 2028,
    isDefault: true,
  },
  {
    id: 'pm_mc',
    brand: 'mastercard',
    last4: '5067',
    expMonth: 3,
    expYear: 2027,
    isDefault: false,
  },
]
