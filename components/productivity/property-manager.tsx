"use client"
import type { DatabaseProperty, DatabasePropertyType } from "@/lib/productivity"
import { useCreateDatabasePropertyMutation } from "@/queries/productivity"
import { Button } from "@gorth-com/primitive/custom/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@gorth-com/primitive/default/card"
import { Input } from "@gorth-com/primitive/default/input"
import { useState } from "react"

const propertyTypes: DatabasePropertyType[] = [
  "title",
  "text",
  "number",
  "select",
  "multi_select",
  "status",
  "date",
  "person",
  "checkbox",
  "url",
  "email",
  "phone",
  "file",
  "relation",
  "rollup",
  "formula",
  "created_time",
  "created_by",
  "last_edited_time",
  "last_edited_by",
]
export function PropertyManager({
  workspaceId,
  databaseId,
  properties,
}: {
  workspaceId: string
  databaseId: string
  properties: DatabaseProperty[]
}) {
  const [create, state] = useCreateDatabasePropertyMutation()
  const [name, setName] = useState("")
  const [type, setType] = useState<DatabasePropertyType>("text")
  const [options, setOptions] = useState("")
  const [reference, setReference] = useState("")
  const [target, setTarget] = useState("")
  const [operation, setOperation] = useState("add")
  const [constant, setConstant] = useState("0")
  const [error, setError] = useState("")
  return (
    <Card>
      <CardHeader>
        <CardTitle>Properties</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            setError("")
            const config: Record<string, unknown> =
              type === "formula"
                ? {
                    expression: {
                      op: operation,
                      args: [{ property: reference }, Number(constant)],
                    },
                  }
                : type === "rollup"
                  ? {
                      relationPropertyId: reference,
                      targetPropertyId: target,
                      operation: operation === "add" ? "count" : operation,
                    }
                  : ["select", "multi_select", "status"].includes(type)
                    ? {
                        options: options
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean),
                      }
                    : {}
            void create({
              workspaceId,
              databaseId,
              name,
              type,
              config,
              position: properties.length,
            })
              .unwrap()
              .then(() => setName(""))
              .catch((cause) =>
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Unable to add property"
                )
              )
          }}
        >
          <Input
            required
            aria-label="Property name"
            placeholder="Property name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="max-w-xs"
          />
          <select
            aria-label="Property type"
            value={type}
            onChange={(event) => {
              setType(event.target.value as DatabasePropertyType)
              setOperation(event.target.value === "rollup" ? "count" : "add")
              setReference("")
            }}
            className="h-9 rounded-md border bg-background px-3"
          >
            {propertyTypes.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          {["select", "multi_select", "status"].includes(type) && (
            <Input
              required
              aria-label="Options"
              placeholder="Options, separated by commas"
              value={options}
              onChange={(event) => setOptions(event.target.value)}
              className="max-w-sm"
            />
          )}
          {(type === "formula" || type === "rollup") && (
            <select
              required
              aria-label="Source property"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className="h-9 rounded-md border bg-background px-3"
            >
              <option value="">Source property</option>
              {properties
                .filter((property) =>
                  type === "rollup"
                    ? property.type === "relation"
                    : ["number", "formula", "rollup"].includes(property.type)
                )
                .map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
            </select>
          )}
          {type === "formula" && (
            <>
              <select
                aria-label="Operation"
                value={operation}
                onChange={(event) => setOperation(event.target.value)}
                className="h-9 rounded-md border bg-background px-3"
              >
                {["add", "subtract", "multiply", "divide"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <Input
                type="number"
                aria-label="Constant"
                value={constant}
                onChange={(event) => setConstant(event.target.value)}
                className="max-w-32"
              />
            </>
          )}
          {type === "rollup" && (
            <>
              <select
                aria-label="Target property"
                required
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                className="h-9 rounded-md border bg-background px-3"
              >
                <option value="">Target property</option>
                {properties
                  .filter((property) =>
                    ["number", "title", "text"].includes(property.type)
                  )
                  .map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
              </select>
              <select
                aria-label="Aggregation"
                value={operation}
                onChange={(event) => setOperation(event.target.value)}
                className="h-9 rounded-md border bg-background px-3"
              >
                {["count", "sum", "average", "minimum", "maximum"].map(
                  (value) => (
                    <option key={value}>{value}</option>
                  )
                )}
              </select>
            </>
          )}
          <Button type="submit" disabled={!name.trim() || state.isLoading}>
            Add property
          </Button>
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
