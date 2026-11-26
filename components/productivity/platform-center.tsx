"use client"
import { StripePayment } from "@/components/productivity/stripe-payment"
import { platformMutation, usePlatformQuery } from "@/queries/platform"
import { caller } from "@/utils/caller"
import { safeContentUrl } from "@/utils/editor"
import { formatMinorAmount } from "@/utils/money"
import { Button } from "@gorth-com/primitive/custom/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gorth-com/primitive/default/card"
import { Input } from "@gorth-com/primitive/default/input"
import { Spinner } from "@gorth-com/primitive/pattern/spinner"
import Link from "next/link"
import { useState } from "react"

interface List<T> {
  data: T[]
  pagination?: { total: number; hasMore?: boolean }
}
interface Notification {
  id: string
  title: string
  body: string | null
  readAt: string | null
  actionUrl: string | null
}
interface Product {
  id: string
  name: string
  plans: {
    id: string
    name: string
    prices: {
      id: string
      unitAmount: number
      currency: string
      interval: string
    }[]
  }[]
}
interface Invoice {
  id: string
  number: string
  status: string
  amountDue: number
  currency: string
}
interface Payment {
  id: string
  referenceId: string
  status: string
  amount: number
  currency: string
}
interface Subscription {
  id: string
  status: string
  cancelAtPeriodEnd: boolean
}

export function NotificationCenter() {
  const [offset, setOffset] = useState(0)
  const notifications = usePlatformQuery<List<Notification>>("/notification", {
    limit: 20,
    offset,
  })
  const [error, setError] = useState("")
  const update = async (id: string, archive = false) => {
    try {
      await platformMutation(
        archive ? "/notification/archive" : "/notification/read",
        {},
        "PATCH",
        { id }
      )
      await notifications.refetch()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update notification"
      )
    }
  }
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Inbox</h1>
      <p role="alert" className="text-destructive">
        {error}
      </p>
      {notifications.isLoading && <Spinner variant="infinite" />}
      {notifications.isError && (
        <p role="alert">
          Notifications are unavailable.{" "}
          <Button
            variant="outline"
            onClick={() => void notifications.refetch()}
          >
            Retry
          </Button>
        </p>
      )}
      {notifications.data?.data.length === 0 && (
        <p className="text-muted-foreground">No notifications yet.</p>
      )}
      {notifications.data?.data.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <CardTitle>{item.title}</CardTitle>
            <CardDescription>{item.body}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            {item.actionUrl?.startsWith("/") &&
              !item.actionUrl.startsWith("//") && (
                <Button
                  render={<Link href={item.actionUrl} />}
                  variant="outline"
                >
                  Open
                </Button>
              )}
            <Button
              variant="outline"
              disabled={Boolean(item.readAt)}
              onClick={() => void update(item.id)}
            >
              Mark read
            </Button>
            <Button variant="ghost" onClick={() => void update(item.id, true)}>
              Archive
            </Button>
          </CardContent>
        </Card>
      ))}
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 20))}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={!notifications.data?.pagination?.hasMore}
          onClick={() => setOffset(offset + 20)}
        >
          Next
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Notification preferences</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[true, false].map((enabled) => (
            <Button
              key={String(enabled)}
              variant="outline"
              onClick={() =>
                void platformMutation(
                  "/notification/preference",
                  { type: "*", channel: "in_app", enabled },
                  "PUT"
                ).catch((cause) => setError(String(cause)))
              }
            >
              {enabled ? "Enable task updates" : "Mute task updates"}
            </Button>
          ))}
        </CardContent>
      </Card>
    </main>
  )
}

export function WorkspaceSearch() {
  const [search, setSearch] = useState("")
  const privatePages = usePlatformQuery<List<{ id: string; title: string }>>(
    "/task/page",
    { search, limit: 50 },
    search.trim().length > 0
  )
  const publicPages = usePlatformQuery<
    List<{ resourceId: string; title: string }>
  >(
    "/discovery/search",
    { application: "task", type: "page", query: search, limit: 20 },
    search.trim().length > 0
  )
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Search</h1>
      <Input
        aria-label="Search documents"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search documents…"
      />
      <Card>
        <CardHeader>
          <CardTitle>Your accessible documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {privatePages.isLoading && <Spinner variant="infinite" />}
          {privatePages.isError && (
            <p role="alert">Workspace search is unavailable.</p>
          )}
          {privatePages.data?.data.map((page) => (
            <Link
              key={page.id}
              className="block rounded-md border p-3 hover:bg-muted"
              href={`/document/${page.id}`}
            >
              {page.title}
            </Link>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Published documents</CardTitle>
          <CardDescription>
            Public results from Discovery. Private documents stay within
            workspace search.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {publicPages.isError && (
            <p role="alert">Public search is unavailable.</p>
          )}
          {publicPages.data?.data.map((page) => (
            <Link
              key={page.resourceId}
              className="block rounded-md border p-3 hover:bg-muted"
              href={`/preview/${page.resourceId}`}
            >
              {page.title}
            </Link>
          ))}
        </CardContent>
      </Card>
    </main>
  )
}

export function BillingCenter() {
  const catalog = usePlatformQuery<List<Product>>("/billing/catalog", {
    application: "task",
  })
  const invoices = usePlatformQuery<List<Invoice>>("/billing/invoice", {
    limit: 50,
  })
  const subscriptions = usePlatformQuery<List<Subscription>>(
    "/billing/subscription",
    { limit: 50 }
  )
  const entitlements = usePlatformQuery<
    { featureKey?: string; value: unknown; expiresAt: string | null }[]
  >("/billing/entitlement", { application: "task" })
  const payments = usePlatformQuery<List<Payment>>("/payment", {
    limit: 50,
    referenceType: "invoice",
  })
  const [provider, setProvider] = useState("stripe")
  const [cardPayment, setCardPayment] = useState<{
    invoiceId: string
    paymentId: string
    clientSecret: string
    publishableKey: string
  } | null>(null)
  const [error, setError] = useState("")
  const attempt = async (operation: () => Promise<unknown>) => {
    setError("")
    try {
      await operation()
      await Promise.all([
        invoices.refetch(),
        subscriptions.refetch(),
        entitlements.refetch(),
        payments.refetch(),
      ])
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Billing operation failed"
      )
    }
  }
  const pay = async (invoice: Invoice) => {
    const result = await caller<{
      checkout?: {
        url?: string
        clientSecret?: string
        publishableKey?: string
      }
      payment?: { id: string }
    }>({
      url: `/billing/invoice/${invoice.id}/payment`,
      method: "POST",
      headers: { "Idempotency-Key": `task-invoice:${invoice.id}:${provider}` },
      body: { provider, returnUrl: `${window.location.origin}/billing` },
      unwrapData: false,
    })
    if (
      result.checkout?.clientSecret &&
      result.checkout.publishableKey &&
      result.payment?.id
    ) {
      setCardPayment({
        invoiceId: invoice.id,
        paymentId: result.payment.id,
        clientSecret: result.checkout.clientSecret,
        publishableKey: result.checkout.publishableKey,
      })
      return
    }
    const url = safeContentUrl(result.checkout?.url)
    if (!url)
      throw new Error(
        "This payment method did not provide a hosted checkout. Select a configured hosted method."
      )
    window.location.assign(url)
  }
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Plans and billing</h1>
      <p className="text-destructive" role="alert">
        {error}
      </p>
      {catalog.isError && (
        <p role="alert">
          Plans are unavailable.{" "}
          <Button variant="outline" onClick={() => void catalog.refetch()}>
            Retry
          </Button>
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {catalog.data?.data.flatMap((product) =>
          product.plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{product.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {plan.prices.map((price) => (
                  <Button
                    key={price.id}
                    onClick={() =>
                      void attempt(() =>
                        platformMutation("/billing/subscription", {
                          priceId: price.id,
                          quantity: 1,
                        })
                      )
                    }
                  >
                    Choose {formatMinorAmount(price.unitAmount, price.currency)}{" "}
                    / {price.interval}
                  </Button>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {catalog.data?.data.length === 0 && (
        <p className="text-muted-foreground">
          No paid plans are currently offered.
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {subscriptions.data?.data.map((item) => (
            <div key={item.id} className="flex justify-between gap-2">
              <span>
                {item.status}
                {item.cancelAtPeriodEnd ? " · ends this period" : ""}
              </span>
              <Button
                variant="outline"
                disabled={
                  item.status === "cancelled" || item.status === "expired"
                }
                onClick={() =>
                  void attempt(() =>
                    platformMutation(
                      `/billing/subscription/${item.id}/${item.cancelAtPeriodEnd ? "resume" : "cancel"}`,
                      { atPeriodEnd: true }
                    )
                  )
                }
              >
                {item.cancelAtPeriodEnd ? "Resume" : "Cancel at period end"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Invoices and payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <select
            aria-label="Payment method"
            className="h-9 rounded-md border bg-background px-3"
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
          >
            {["stripe", "momo", "zalopay", "vnpay"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          {invoices.isError && <p>Invoices are unavailable.</p>}
          {invoices.data?.data.map((invoice) => (
            <div key={invoice.id} className="space-y-2 rounded-md border p-3">
              <p>
                {invoice.number} · {invoice.status} ·{" "}
                {formatMinorAmount(invoice.amountDue, invoice.currency)}
              </p>
              {invoice.status === "open" && (
                <Button onClick={() => void attempt(() => pay(invoice))}>
                  Pay securely
                </Button>
              )}
              {payments.data?.data
                .filter((payment) => payment.referenceId === invoice.id)
                .map((payment) => (
                  <div key={payment.id} className="flex items-center gap-2">
                    <span>{payment.status}</span>
                    <Button
                      variant="outline"
                      onClick={() =>
                        void attempt(async () => {
                          await platformMutation(
                            `/payment/${payment.id}/query`,
                            {}
                          )
                          await platformMutation(
                            `/billing/invoice/${invoice.id}/reconcile`,
                            { paymentId: payment.id }
                          )
                        })
                      }
                    >
                      Refresh payment and reconcile
                    </Button>
                  </div>
                ))}
            </div>
          ))}
        </CardContent>
      </Card>
      {cardPayment && (
        <StripePayment
          clientSecret={cardPayment.clientSecret}
          publishableKey={cardPayment.publishableKey}
          onComplete={async () => {
            await platformMutation(
              `/payment/${cardPayment.paymentId}/query`,
              {}
            )
            await platformMutation(
              `/billing/invoice/${cardPayment.invoiceId}/reconcile`,
              { paymentId: cardPayment.paymentId }
            )
            setCardPayment(null)
            await invoices.refetch()
            await entitlements.refetch()
          }}
        />
      )}
      <Card>
        <CardHeader>
          <CardTitle>Active features</CardTitle>
        </CardHeader>
        <CardContent>
          {entitlements.isError && <p>Feature access is unavailable.</p>}
          {entitlements.data?.map((item, index) => (
            <p key={index}>
              {item.featureKey ?? "Plan feature"}: {String(item.value)}
              {item.expiresAt
                ? ` · until ${new Date(item.expiresAt).toLocaleDateString()}`
                : ""}
            </p>
          ))}
        </CardContent>
      </Card>
    </main>
  )
}
