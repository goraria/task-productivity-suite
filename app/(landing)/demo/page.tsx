"use client"

import { useState } from "react"
import { Button } from "@/components/primitive/default"
import { Input, Label, Textarea } from "@/components/primitive/default"
import { toast } from "@gorth-com/primitive/custom/toast"
import { useAuth } from "@/hooks/use-auth"
import { normalizeRequestRecord, stringifyJson } from "@/utils/formatter"
import { parseJsonInput } from "@/utils/input"
import type { DemoApiRequest } from "@/utils/interface"
import { useDemoJsonMutation } from "@/queries/demo"

const initialParams = {
  from: "demo-page",
}

const initialBody = {
  title: "Demo body",
  // enabled: true,
}

const initialHeaders = {
  "x-demo-client": "demo-page",
  "x-demo-feature": "endpoint",
}

const initialTimeout = 10000

export default function Page() {
  const {
    signingIn,
    account,
    loading,
    authenticated,
    login,
    register,
    logout,
  } = useAuth()
  const [paramsText, setParamsText] = useState(() =>
    stringifyJson(initialParams)
  )
  const [bodyText, setBodyText] = useState(() => stringifyJson(initialBody))
  const [headersText, setHeadersText] = useState(() =>
    stringifyJson(initialHeaders)
  )
  const [timeoutText, setTimeoutText] = useState(String(initialTimeout))
  const [requestArg, setRequestArg] = useState<DemoApiRequest>(() => ({
    params: initialParams,
    body: initialBody,
    headers: initialHeaders,
    timeout: initialTimeout,
  }))
  const [runDemo, { data: resultDemo, error: demoError, isLoading }] =
    useDemoJsonMutation()
  const demoLoading = isLoading

  const fetchDemo = async () => {
    const params = parseJsonInput(paramsText, {
      label: "Params",
      objectOnly: true,
    })
    const body = parseJsonInput(bodyText, { label: "Body" })
    const headers = parseJsonInput(headersText, {
      label: "Headers",
      objectOnly: true,
    })
    const timeout = Number(timeoutText)

    if (params === null || body === null || headers === null) {
      return
    }

    if (!Number.isFinite(timeout) || timeout <= 0) {
      toast.add({
        type: "error",
        description: "Timeout must be a number greater than 0",
      })
      return
    }

    const nextArg: DemoApiRequest = {
      params: normalizeRequestRecord(params, "params"),
      body,
      headers: normalizeRequestRecord(headers, "headers"),
      timeout,
    }

    setRequestArg(nextArg)
    try {
      await runDemo(nextArg).unwrap()
      toast.add({
        type: "success",
        description: "Demo request sent successfully",
      })
    } catch (error) {
      toast.add({
        type: "error",
        description: error instanceof Error ? error.message : "Request failed",
      })
    }
  }

  const resetDemo = () => {
    setParamsText(stringifyJson(initialParams))
    setBodyText(stringifyJson(initialBody))
    setHeadersText(stringifyJson(initialHeaders))
    setTimeoutText(String(initialTimeout))
    setRequestArg({
      params: initialParams,
      body: initialBody,
      headers: initialHeaders,
      timeout: initialTimeout,
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {loading ? (
        <Button type="button" disabled>
          Loading
        </Button>
      ) : authenticated ? (
        <Button type="button" onClick={() => logout()}>
          Sign out
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={signingIn}
            aria-busy={signingIn}
            onClick={() => login("/demo")}
          >
            Sign in
          </Button>
          <Button
            type="button"
            disabled={signingIn}
            aria-busy={signingIn}
            onClick={() => register("/demo")}
          >
            Register
          </Button>
        </div>
      )}

      <div className="rounded border p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">Next router API</h3>
              <p className="text-sm text-muted-foreground">
                Enter params, body, headers, and timeout for the demo request.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={resetDemo}>
                Reset
              </Button>
              <Button
                type="button"
                onClick={() => void fetchDemo()}
                disabled={demoLoading}
              >
                Fetch
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="demo-params">Params JSON</Label>
              <Textarea
                id="demo-params"
                value={paramsText}
                onChange={(event) => setParamsText(event.target.value)}
                className="min-h-32 font-mono text-xs"
                spellCheck={false}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="demo-headers">Headers JSON</Label>
              <Textarea
                id="demo-headers"
                value={headersText}
                onChange={(event) => setHeadersText(event.target.value)}
                className="min-h-32 font-mono text-xs"
                spellCheck={false}
              />
            </div>
            <div className="grid gap-2 lg:col-span-2">
              <Label htmlFor="demo-body">Body JSON</Label>
              <Textarea
                id="demo-body"
                value={bodyText}
                onChange={(event) => setBodyText(event.target.value)}
                className="min-h-40 font-mono text-xs"
                spellCheck={false}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="demo-timeout">Timeout</Label>
              <Input
                id="demo-timeout"
                type="number"
                min={1}
                value={timeoutText}
                onChange={(event) => setTimeoutText(event.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md bg-muted p-3 font-mono text-xs leading-6 text-muted-foreground">
            <div>loading: {String(demoLoading)}</div>
            <div>error: {demoError ? JSON.stringify(demoError) : "null"}</div>
            <div>request: {JSON.stringify(requestArg)}</div>
          </div>
        </div>

        {demoLoading ? (
          <p className="mt-4">Loading API...</p>
        ) : demoError ? (
          <p className="mt-4 text-sm text-destructive">{demoError.message}</p>
        ) : (
          <pre className="mt-4 max-h-96 overflow-auto rounded-md border p-3 text-xs">
            {JSON.stringify(resultDemo, null, 2)}
          </pre>
        )}
      </div>

      <div className="rounded border p-4">
        <h3 className="font-bold">Login status:</h3>
        {loading ? (
          <p>Loading...</p>
        ) : account ? (
          <pre className="overflow-auto p-2 text-xs">
            {JSON.stringify(
              {
                id: account.id,
                email: account.email,
                app_metadata: account.app_metadata,
                user_metadata: account.user_metadata,
                authenticated,
              },
              null,
              2
            )}
          </pre>
        ) : (
          <p>Not logged in</p>
        )}
      </div>
    </div>
  )
}
