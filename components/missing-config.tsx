import { KeyRound } from 'lucide-react'

export function MissingConfig() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="max-w-md rounded-2xl border bg-card p-8 text-center">
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <KeyRound className="size-5" aria-hidden="true" />
        </div>
        <h1 className="text-balance text-xl font-semibold">Privy App ID required</h1>
        <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
          Add <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">NEXT_PUBLIC_PRIVY_APP_ID</code>{' '}
          in the Vars section of project settings. This is a public client ID, not a wallet secret. Also allow your site
          domain in the Privy dashboard before enabling wallet sign-in.
        </p>
      </div>
    </main>
  )
}
