// app/page.tsx
import { UsernameForm } from '@/components/UsernameForm';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-10 py-12 grow">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Zach&apos;s Boards
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            No sign-up. No passwords.
            <br />
            Just use a username — new or existing — and start
            organizing.
          </p>
        </div>

        {/* Form card */}
        <div className="shadow-xl rounded-2xl p-8 border ">
          <UsernameForm />
        </div>

        {/* Subtle hints */}
        <p className="text-center text-sm text-muted-foreground/80">
          Already used this before? Just type your username again —
          your boards are waiting.
        </p>
        <p className="text-center text-xs text-muted-foreground/60">
          Boards are public by username. Share carefully or keep
          usernames unique/private.
        </p>
      </div>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-sm">
        <p>
          Created with ❤️ by Zachary Clark •{' '}
          <a
            href="https://portfolio.zaclark.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline transition-colors"
          >
            Zaclark.com
          </a>{' '}
          •{' '}
          <a
            href="https://ko-fi.com/spacedubby07"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline transition-colors"
          >
            Support Me on Ko-fi
          </a>
        </p>
      </footer>
    </div>
  );
}
