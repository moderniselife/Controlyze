"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, Activity, Shield, Zap, Box, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }

      const redirect = searchParams.get("redirect") || "/";
      router.push(redirect);
      router.refresh();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Activity,
      title: "Real-time Monitoring",
      description: "Track container health and performance live",
    },
    {
      icon: Shield,
      title: "Automated Alerts",
      description: "Get notified when something needs attention",
    },
    {
      icon: Box,
      title: "Stack Management",
      description: "Organize and control your Docker stacks",
    },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/50 via-[#09090b] to-[#09090b]" />
        
        {/* Animated glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-600/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-8 py-12">
          <div className="max-w-sm">
          {/* Logo and title */}
          <div className="mb-16">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl scale-150" />
              <Image
                src="/logo.png"
                alt="Controlyze"
                width={80}
                height={80}
                className="relative rounded-2xl drop-shadow-2xl"
              />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">Controlyze</h1>
            <p className="text-zinc-400 text-lg">Your Docker infrastructure, simplified.</p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm transition-all hover:bg-white/[0.04] hover:border-purple-500/20"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400">
                  <feature.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-zinc-500">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-12">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl scale-150" />
              <Image
                src="/logo.png"
                alt="Controlyze"
                width={64}
                height={64}
                className="relative rounded-xl"
              />
            </div>
            <h1 className="text-2xl font-bold text-white">Controlyze</h1>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-2">Welcome back</h2>
            <p className="text-zinc-500">Sign in with your credentials to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-zinc-400">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full h-12 px-4 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 transition-all"
                required
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-zinc-400">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full h-12 px-4 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 transition-all"
                required
                autoComplete="current-password"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-zinc-600 text-sm flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" />
            Powered by Controlyze
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030108] flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 bg-purple-500/30 rounded-full blur-xl animate-pulse" />
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
