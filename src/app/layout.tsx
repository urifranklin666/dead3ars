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
    "A twelve-module course in modern attack technique and its defense, taught entirely inside labs the student owns.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await viewer();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a href="#main" className="dz-skip">
          Skip to content
        </a>
        <Nav user={user} />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-5 sm:py-12">
          {children}
        </main>
        <footer className="mt-8 border-t border-line/80 bg-bg/50">
          <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 sm:px-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xl space-y-2 text-xs leading-relaxed text-muted">
              <p>
                <strong className="text-ink">Coursework only.</strong> Every technique in
                this course is practised inside an isolated lab the student owns. None of it
                may be pointed at a system without prior written authorisation from the
                system&rsquo;s owner.
              </p>
              <p>
                Unauthorised access is a criminal offence under the CFAA, the UK Computer
                Misuse Act 1990, EU Directive 2013/40/EU, and equivalent law elsewhere.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
              <span className="text-accent">dead3ars</span>
              <span>offensive security, taught defensively</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
