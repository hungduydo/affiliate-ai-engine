import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@shared/utils/cn';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const [dark, setDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <header className="flex items-center justify-between px-6 h-14 border-b border-zinc-800 bg-zinc-950 shrink-0">
      <h1 className="text-white font-medium text-base">{title}</h1>
      <button
        onClick={() => setDark((d) => !d)}
        className={cn(
          'p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors',
        )}
        aria-label="Toggle dark mode"
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  );
}
