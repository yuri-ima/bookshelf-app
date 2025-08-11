// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./_providers/AuthProvider";

export const metadata: Metadata = { title: "MemoryShelf" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
