import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import Navigation from "@/components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pokémon Center | Your #1 Source for Pokémon in Canada",
  description: "Your #1 Source for Pokémon in Canada. Explore the ultimate collection of rare Pokémon cards, elite trainer boxes, and premium booster bundles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AuthProvider>
          <CartProvider>
            <Navigation />
            <main className="main-content">
              {children}
            </main>
            <footer className="footer">
              <div className="container">
                <div className="footer-logo">POKÉMON CENTER</div>
                <p style={{ marginBottom: 16 }}>Your #1 Source for Pokémon in Canada. Premier vault for authentic trading card collectibles and pre-orders.</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Copyright {new Date().getFullYear()} Pokémon Center. All rights reserved. Locally simulated shop.
                </p>
              </div>
            </footer>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
