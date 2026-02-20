// components/UsernameForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function UsernameForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleaned = username.trim().toLowerCase();
    if (!cleaned) return;

    if (cleaned.length < 3 || cleaned.length > 20) {
      toast.error('Username should be 3–20 characters');
      return;
    }

    if (!/^[a-z0-9_-]+$/.test(cleaned)) {
      toast.error('Only lowercase letters, numbers, -, _ allowed');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleaned }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Couldn't process username");
        setIsLoading(false);
        return;
      }

      // Both new & existing users get here
      toast.success(
        data.message ||
          `Welcome${data.message?.includes('back') ? ' back' : ''}, ${data.username}!`,
      );

      router.push(`/board/${data.username}`);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      toast.error('Network error — try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="username" className="text-base font-medium">
          Your username
        </Label>
        <Input
          id="username"
          placeholder="imagination-is-the-limit, project-x, kanban-2026"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoComplete="off"
          disabled={isLoading}
          className="h-12 text-base placeholder:text-muted-foreground/70"
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full text-base font-medium"
        disabled={isLoading}
      >
        {isLoading ? 'Checking...' : 'Go to my boards →'}
      </Button>
    </form>
  );
}
