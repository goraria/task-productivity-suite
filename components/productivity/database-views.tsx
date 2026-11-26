"use client"
import type {
  DatabaseProperty,
  Page,
  PagePropertyValue,
} from "@/lib/productivity"
import { unwrapPropertyValue } from "@/utils/database-properties"
import { Button } from "@gorth-com/primitive/custom/button"
import Link from "next/link"
import { useMemo, useState } from "react"

export function ListDatabaseView({ rows }: { rows: Page[] }) {
  return (
    <ul className="divide-y rounded-lg border">
      {rows.map((page) => (
        <li key={page.id} className="p-4">
          <Link href={`/document/${page.id}`} className="font-medium">
            {page.icon} {page.title}
          </Link>
          <p className="text-xs text-muted-foreground">
            Updated {new Date(page.updatedAt).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  )
}
const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
export function DateDatabaseView({
  rows,
  properties,
  values,
  timeline = false,
}: {
  rows: Page[]
  properties: DatabaseProperty[]
  values: PagePropertyValue[]
  timeline?: boolean
}) {
  const [monthOffset, setMonthOffset] = useState(0)
  const [dateProperty, setDateProperty] = useState("")
  const property =
    properties.find(
      (item) => item.id === dateProperty && item.type === "date"
    ) ?? properties.find((item) => item.type === "date")
  const entries = useMemo(
    () =>
      rows.map((page) => ({
        page,
        date: String(
          unwrapPropertyValue(
            values.find(
              (value) =>
                value.pageId === page.id && value.propertyId === property?.id
            )?.value
          ) ?? ""
        ).slice(0, 10),
      })),
    [rows, values, property]
  )
  if (!property)
    return (
      <p
        role="status"
        className="rounded-lg border border-dashed p-8 text-center text-muted-foreground"
      >
        Add a Date property to use this {timeline ? "timeline" : "calendar"}.
      </p>
    )
  const today = new Date()
  const month = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0
  ).getDate()
  const days = Array.from(
    { length: daysInMonth },
    (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1)
  )
  const scheduled = entries.filter((entry) =>
    entry.date.startsWith(dayKey(month).slice(0, 7))
  )
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select
          aria-label="Date property"
          value={property.id}
          onChange={(event) => setDateProperty(event.target.value)}
          className="h-9 rounded-md border bg-background px-3"
        >
          {properties
            .filter((item) => item.type === "date")
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            aria-label="Previous month"
            onClick={() => setMonthOffset((value) => value - 1)}
          >
            ←
          </Button>
          <h3 className="min-w-36 text-center font-medium">
            {month.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <Button
            variant="outline"
            aria-label="Next month"
            onClick={() => setMonthOffset((value) => value + 1)}
          >
            →
          </Button>
          <Button variant="ghost" onClick={() => setMonthOffset(0)}>
            Today
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Showing dates for this result page. Search, filters and pagination above
        apply to every view.
      </p>
      {timeline ? (
        <div className="overflow-x-auto rounded-lg border">
          <div style={{ minWidth: daysInMonth * 44 + 200 }}>
            <div className="flex border-b">
              <span className="w-48 shrink-0 p-2 text-sm">Document</span>
              {days.map((day) => (
                <span
                  key={dayKey(day)}
                  className="w-11 shrink-0 border-l p-2 text-center text-xs"
                >
                  {day.getDate()}
                </span>
              ))}
            </div>
            {scheduled.map(({ page, date }) => (
              <div
                key={page.id}
                className="flex items-center border-b last:border-b-0"
              >
                <Link
                  href={`/document/${page.id}`}
                  className="w-48 shrink-0 truncate p-3 text-sm"
                >
                  {page.title}
                </Link>
                <div className="relative h-11 flex-1 bg-muted/20">
                  <Link
                    aria-label={`${page.title} on ${date}`}
                    href={`/document/${page.id}`}
                    className="absolute top-2 h-7 rounded-md bg-primary text-center text-sm text-primary-foreground"
                    style={{
                      left: (Number(date.slice(8)) - 1) * 44 + 4,
                      width: 36,
                    }}
                  >
                    ●
                  </Link>
                </div>
              </div>
            ))}
            {!scheduled.length && (
              <p className="p-6 text-sm text-muted-foreground">
                No dated records this month on the current result page.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <div className="min-w-[630px]">
            <div className="grid grid-cols-7 border-b">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="p-2 text-center text-xs text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: month.getDay() }, (_, index) => (
                <div
                  key={`empty-${index}`}
                  className="min-h-28 border-b border-r bg-muted/20"
                />
              ))}
              {days.map((day) => (
                <div
                  key={dayKey(day)}
                  className="min-h-28 space-y-1 border-b border-r p-2"
                >
                  <span
                    className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${dayKey(day) === dayKey(today) ? "bg-primary text-primary-foreground" : ""}`}
                  >
                    {day.getDate()}
                  </span>
                  {entries
                    .filter((entry) => entry.date === dayKey(day))
                    .map(({ page }) => (
                      <Link
                        key={page.id}
                        href={`/document/${page.id}`}
                        className="block truncate rounded bg-muted p-1 text-xs"
                      >
                        {page.title}
                      </Link>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {entries.some((entry) => !entry.date) && (
        <div className="rounded-lg border p-3">
          <h4 className="mb-2 text-sm font-medium">Unscheduled</h4>
          <div className="flex flex-wrap gap-2">
            {entries
              .filter((entry) => !entry.date)
              .map(({ page }) => (
                <Link
                  key={page.id}
                  href={`/document/${page.id}`}
                  className="rounded-md bg-muted p-2 text-sm"
                >
                  {page.title}
                </Link>
              ))}
          </div>
        </div>
      )}
    </section>
  )
}
