import './globals.css';
import { Metadata } from 'next';

export const siteTitle: string = 'SmallTalk';

export const metadata: Metadata = {
  title: siteTitle,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
