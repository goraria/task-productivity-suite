export interface RenderStatusMeta {
  label: string
  className: string
}

export function renderStatusMeta(value: string | null | undefined): RenderStatusMeta {
  switch (value) {
    case "active":
    case "ok":
    case "success":
      return { label: "Active", className: "text-emerald-700 bg-emerald-50" }
    case "pending":
      return { label: "Pending", className: "text-amber-700 bg-amber-50" }
    case "inactive":
    case "disabled":
      return { label: "Inactive", className: "text-slate-700 bg-slate-100" }
    case "error":
    case "failed":
      return { label: "Failed", className: "text-red-700 bg-red-50" }
    default:
      return {
        label: value ? value.replace(/[-_]/g, " ") : "Unknown",
        className: "text-slate-700 bg-slate-100",
      }
  }
}
