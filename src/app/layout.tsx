// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/AuthContext'; // Import AuthProvider

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'WeatherEyes',
  description: 'Real-time weather forecasts, AI scenes, and saved searches.',
  icons: {
    icon: '/favicon.ico', // Assumes src/app/favicon.ico exists
    apple: '/apple-icon.png', // Assumes src/app/apple-icon.png exists for Apple devices
    // You can add other icon types here if needed, e.g., for different sizes or shortcut icons
    // shortcut: '/shortcut-icon.png', 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider> {/* Wrap children with AuthProvider */}
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
