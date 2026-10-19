import type { Metadata } from 'next';
import './styles.css';
export const metadata: Metadata = { title: 'Omnivae', description: 'Your space to plan, reflect, and grow.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
