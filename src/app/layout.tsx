import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { viewer } from "@/lib/session";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "dead3ars — offensive security, taught defensively",
  description:
    "A twelve-module course in modern attack technique and its defence, taught entirely inside labs the student owns.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await viewer();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Nav user={user} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
          {children}
        </main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-5xl px-5 py-6 text-xs leading-relaxed text-muted">
            <p>
              <strong className="text-ink">Coursework only.</strong> Every technique in
              this course is practised inside an isolated lab the student owns. None of it
              may be pointed at a system without prior written authorisation from the
              system&rsquo;s owner.
            </p>
            <p className="mt-2">
              Unauthorised access is a criminal offence under the CFAA, the UK Computer
              Misuse Act 1990, EU Directive 2013/40/EU, and equivalent law elsewhere.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
