// app/page.tsx
import { UsernameForm } from '@/components/UsernameForm';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-white to-slate-100 px-4">
      <div className="w-full max-w-md space-y-10 py-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Kanban Boards
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            No sign-up. No passwords.
            <br />
            Just use a username — new or existing — and start
            organizing.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white shadow-xl rounded-2xl p-8 border border-slate-200/70">
          <UsernameForm />
        </div>

        {/* Subtle hint for returning users */}
        <p className="text-center text-sm text-muted-foreground/80">
          Already used this before? Just type your username again —
          your boards are waiting.
        </p>

        <p className="text-center text-xs text-muted-foreground/60 pt-4">
          Boards are public by username. Share carefully or keep
          usernames unique/private.
        </p>
      </div>
    </div>
  );
}
