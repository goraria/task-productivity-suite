import Link from "next/link"
export default function AuthErrorPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-xl font-medium">Unable to sign in</h1>
      <p className="text-muted-foreground">Please return and try again.</p>
      <Link href="/">Return to Task</Link>
    </main>
  )
}
