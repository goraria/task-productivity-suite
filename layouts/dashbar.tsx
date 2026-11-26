import { useAuth } from "@/hooks/use-auth"
import { useUser } from "@/hooks/use-user"
import { SidebarTrigger } from "@gorth-com/primitive/custom/sidebar"
import { Separator } from "@gorth-com/primitive/default/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@gorth-com/primitive/default/tooltip"
import { ModeSwitcher } from "@gorth-com/primitive/element/mode-toggle"
import { Dashbar as Container } from "@gorth-com/primitive/layouts/dashbar"
import { AppBrand } from "@/components/app-brand"
import Link from "next/link"

export function Dashbar() {
  const auth = useAuth()
  const { user } = useUser()
  return (
    <Container
      user={user ?? { name: "Visitor", email: "", avatar: "" }}
      auth={auth}
      nav={{ main: [], secondary: [], navigation: [] }}
      left={
        <>
          <Tooltip>
            <TooltipTrigger
              render={<SidebarTrigger className="size-9 rounded-md" />}
            ></TooltipTrigger>
            <TooltipContent side="left">
              <p>Add to library</p>
            </TooltipContent>
          </Tooltip>
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />

          <div className="mr-4 flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <AppBrand />
            </Link>
          </div>
        </>
      }
      right={
        <>
          <ModeSwitcher />
        </>
      }
    />
  )
}
