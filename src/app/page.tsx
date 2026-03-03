// app/page.tsx
import { UsernameForm } from '@/components/UsernameForm';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 select-none">
      <div className="w-full max-w-md space-y-10 py-12 grow">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Zach&apos;s Boards
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            No sign-up. No passwords.
            <br />
            Just a username - new or existing.
          </p>
        </div>

        {/* Form card */}
        <div className="shadow-xl rounded-2xl p-8 border ">
          <UsernameForm />
        </div>

        {/* Subtle hints */}
        <p className="text-center text-sm text-muted-foreground/80">
          Already used this before? Just type your username again
        </p>
        <p className="text-center text-xs text-muted-foreground/60">
          <span className="text-white underline">
            Boards are public by username
          </span>
          . Share carefully or keep usernames unique.
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
            className="text-primary underline transition-colors hover:text-pink-400"
          >
            zaclark.com
          </a>{' '}
          •{' '}
          <a
            href="https://ko-fi.com/spacedubby07"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline transition-colors hover:text-red-400"
          >
            Support Me on Ko-fi
          </a>
        </p>
      </footer>
    </div>
  );
}
