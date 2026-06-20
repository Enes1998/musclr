import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { NavBar } from '../components/NavBar';
import { SyncProvider } from '../components/SyncProvider';

export const metadata: Metadata = {
  title: 'musclr — evidence-based training, visualized',
  description:
    'Track your lifts, see undertrained and overtrained muscles on a 3D body, and get science-grounded coaching and nutrition guidance.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg font-ui text-ink antialiased">
        <SyncProvider />
        <NavBar />
        {children}
      </body>
    </html>
  );
}
