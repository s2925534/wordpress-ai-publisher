import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'WordPress AI Publishing Assistant',
  description: 'Generic foundation for a WordPress AI publishing workflow.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
