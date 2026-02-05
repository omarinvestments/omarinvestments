import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { RoleProvider } from '@/lib/contexts/RoleContext';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'O.I. Properties',
  description: 'Property management platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <RoleProvider>{children}</RoleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
