"use client"

import { useScrollTop } from "@/hooks/use-scroll-top"
import { cn } from "@gorth-com/primitive/cores/cn"
import { Logo } from "./logo"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@gorth-com/primitive/custom/button"
import { Spinner } from "@/components/spinner"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"

export const Navbar = () => {
  const {
    signingIn,
    authenticated: isAuthenticated,
    loading: isLoading,
    login,
    register,
  } = useAuth()
  const scrolled = useScrollTop()

  return (
    <nav
      className={cn(
        "bg-background dark:bg-dark sticky inset-x-0 top-0 z-50 mx-auto flex w-full items-center p-6",
        scrolled && "border-b shadow-xs"
      )}
    >
      <Logo />
      <div className="flex w-full items-center justify-end md:ml-auto">
        <div className="flex items-center gap-x-2">
          {isLoading && <Spinner />}
          {!isLoading && !isAuthenticated && (
            <>
              <Button
                type="button"
                className="hidden md:block"
                variant="ghost"
                size="sm"
                disabled={signingIn}
                aria-busy={signingIn}
                onClick={() => login("/document")}
              >
                Log In
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={signingIn}
                aria-busy={signingIn}
                onClick={() => register("/document")}
              >
                Get Zotion Free
              </Button>
            </>
          )}

          {isAuthenticated && !isLoading && (
            <>
              <Button
                render={<Link href="/document" />}
                variant="ghost"
                size="sm"
              >
                Enter Zotion
              </Button>
            </>
          )}
          <ModeToggle />
        </div>
      </div>
    </nav>
  )
}
