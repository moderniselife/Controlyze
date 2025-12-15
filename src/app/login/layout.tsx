import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Controlyze",
  description: "Sign in to your Controlyze dashboard",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
