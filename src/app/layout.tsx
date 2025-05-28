import type {Metadata} from 'next';
import { GeistSans } from 'next/font/google'; // Corrected import for GeistSans
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Added Toaster

const geistSans = GeistSans({ // Used GeistSans directly
  variable: '--font-geist-sans',
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
      <body className={`${geistSans.variable} font-sans antialiased`}> {/* Ensured font-sans is applied */}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
