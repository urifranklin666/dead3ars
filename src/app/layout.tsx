import type { Metadata } from "next";
import Script from "next/script";
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
  metadataBase: new URL(process.env.DZ_PUBLIC_URL || "https://blackwire.deadplug.digital"),
  title: "Blackwire — offensive security, taught defensively",
  description:
    "A live KVM cyber-range and cybersecurity curriculum pairing attack mechanics with defensive controls, detection, and real-time instructor supervision.",
  openGraph: {
    type: "website",
    siteName: "Blackwire",
    title: "Blackwire — offensive security, taught defensively",
    description:
      "17 modules, 15 air-gapped Debian 12 KVM lab scenarios, and 56 MITRE ATT&CK techniques — streamed directly to your browser.",
    url: "https://blackwire.deadplug.digital",
    images: [
      {
        url: "/og-blackwire.jpg",
        width: 1408,
        height: 768,
        alt: "Blackwire Cyber Range — Offensive security, taught defensively",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blackwire — offensive security, taught defensively",
    description:
      "17 modules, 15 air-gapped Debian 12 KVM lab scenarios, and real-time instructor supervision — streamed straight to your browser.",
    images: ["/og-blackwire.jpg"],
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await viewer();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* CH 404 network bar — shared design bundle from the hub; Blackwire keeps its own skin */}
        <link rel="stylesheet" href="https://deadplug.digital/signal/v1/signal.css?v=1.0.0" />
      </head>
      <body className="flex min-h-full flex-col">
        <Script src="https://deadplug.digital/signal/v1/signal.js?v=1.0.0" strategy="afterInteractive" data-sg-channel="blackwire" />
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
                Blackwire is practised inside an air-gapped, ephemeral KVM virtual machine.
                None of it may be pointed at a system without prior written authorisation
                from the system&rsquo;s owner.
              </p>
              <p>
                Unauthorised access is a criminal offence under the CFAA, the UK Computer
                Misuse Act 1990, EU Directive 2013/40/EU, and equivalent law elsewhere.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
              <span className="font-bold text-ink">
                BLACK<span className="text-accent">WIRE</span>
              </span>
              <span>offensive security, taught defensively</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
