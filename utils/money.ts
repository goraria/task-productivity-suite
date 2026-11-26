export function formatMinorAmount(
  amount: number,
  currency: string,
  locale?: string
) {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  })
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2
  return formatter.format(amount / 10 ** digits)
}
