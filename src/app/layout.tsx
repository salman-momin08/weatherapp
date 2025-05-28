import type {Metadata} from 'next';
import { Inter } from 'next/font/google'; // Changed from GeistSans to Inter
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ // Changed from GeistSans to Inter and updated const name
  variable: '--font-sans', // Using a generic variable name --font-sans
  subsets: ['latin'],
});

// Geist Mono can be kept if specific mono font sections are needed, otherwise remove if not used.
// const geistMono = GeistMono({
//   variable: '--font-geist-mono',
//   subsets: ['latin'],
// });

export const metadata: Metadata = {
  title: 'WeatherEyes', // Updated App Name
  description: 'Real-time weather forecasts and AI-generated weather scenes.', // Updated Description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}> {/* Use the new inter.variable and kept font-sans for Tailwind compatibility */}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
