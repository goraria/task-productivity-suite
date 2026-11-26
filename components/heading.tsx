"use client"

import { Spinner } from "@/components/spinner"
import { Button } from "@gorth-com/primitive/custom/button"
// import { SignInButton, SignUpButton } from "@clerk/nextjs";
// import { useConvexAuth } from "convex/react";
import { ArrowRight } from "@gorth-com/primitive/cores/lucide"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"

export const Heading = () => {
  const {
    signingIn,
    authenticated: isAuthenticated,
    loading: isLoading,
    register,
  } = useAuth()

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-3xl font-bold sm:text-5xl md:text-5xl">
        Your Ideas💡, Documents📕, & Plans🚀. Welcome to{" "}
        <span className="underline">Zotion</span>
      </h1>
      <h2 className="text-base font-medium sm:text-xl">
        Zotion is the connected workspace where <br /> better, faster work
        happens.
      </h2>
      {isLoading && (
        <div className="flex w-full items-center justify-center">
          <Spinner />
          {/** size="md" */}
        </div>
      )}
      {isAuthenticated && !isLoading && (
        <Button render={<Link href="/document" />}>
          Enter Zotion
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
      {!isAuthenticated && !isLoading && (
        <Button
          type="button"
          disabled={signingIn}
          aria-busy={signingIn}
          onClick={() => register("/document")}
        >
          Get Zotion free
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
