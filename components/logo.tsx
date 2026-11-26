import { AppBrand } from "@/components/app-brand"
import { appGlobal } from "@/utils/constant"

export const Logo = ({
  variant = "sidebar",
}: {
  variant?: "sidebar" | "footer"
}) => {
  return (
    <div className="flex items-center justify-center gap-x-2">
      <AppBrand variant={variant} />
      {variant === "footer" && (
        <span className="text-2xl font-bold tracking-tight text-foreground">
          {appGlobal.name}
        </span>
      )}
    </div>
  )
}
