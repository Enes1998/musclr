'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS: [string, string][] = [
  ['/', 'Home'],
  ['/log', 'Log'],
  ['/summary', 'Summary'],
  ['/nutrition', 'Nutrition'],
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-10 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-6 px-6 py-4">
        <Link href="/" className="font-mono text-sm font-semibold tracking-widest text-accent">
          musclr
        </Link>
        <div className="flex gap-1">
          {LINKS.map(([href, label]) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  active ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
