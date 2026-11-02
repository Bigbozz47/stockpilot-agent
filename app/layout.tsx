import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StockPilot Agent™ — Autonomous Supply Chain Console',
  description: 'Real-time inventory replenishment and procurement orchestration console.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8FAFC] font-sans text-[#212121] antialiased">{children}</body>
    </html>
  );
}
