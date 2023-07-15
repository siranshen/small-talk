import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SmallTalk',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
