import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Status | Controlyze",
  description: "Real-time status of all services",
  openGraph: {
    title: "System Status",
    description: "Real-time status of all services",
    type: "website",
  },
};

export default function StatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
