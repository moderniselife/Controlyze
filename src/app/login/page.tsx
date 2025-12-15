"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, AlertCircle, Loader2, Lock, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState<string | null>(null);

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
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030108] flex items-center justify-center p-4 overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      
      {/* Glowing orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[150px]" />
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-purple-400/40 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-md">
        {/* Glowing card border effect */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 rounded-3xl opacity-50 blur-sm" />
        <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 rounded-3xl opacity-30" />
        
        {/* Main card */}
        <div className="relative bg-[#0a0612]/90 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-8 shadow-2xl shadow-purple-900/20">
          {/* Logo section with glow */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              {/* Owl eye glow effect */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-purple-500/30 rounded-full blur-xl animate-pulse" />
              </div>
              <div className="relative">
                <Image
                  src="/logo.png"
                  alt="Controlyze"
                  width={100}
                  height={100}
                  className="rounded-2xl relative z-10 drop-shadow-[0_0_25px_rgba(139,92,246,0.5)]"
                />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold mt-6 bg-gradient-to-r from-purple-300 via-violet-200 to-purple-300 bg-clip-text text-transparent">
              Controlyze
            </h1>
            <p className="text-purple-300/60 mt-2 flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              Secure Access Portal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username field */}
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-purple-200/80 flex items-center gap-2">
                <User className="w-4 h-4" />
                Username
              </label>
              <div className="relative group">
                <div className={`absolute -inset-[1px] bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl opacity-0 group-hover:opacity-50 transition-opacity blur-sm ${isFocused === 'username' ? 'opacity-70' : ''}`} />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setIsFocused('username')}
                  onBlur={() => setIsFocused(null)}
                  placeholder="Enter your username"
                  className="relative bg-purple-950/30 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40 h-12 rounded-xl focus:border-purple-500/50 focus:ring-purple-500/20 transition-all"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-purple-200/80 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </label>
              <div className="relative group">
                <div className={`absolute -inset-[1px] bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl opacity-0 group-hover:opacity-50 transition-opacity blur-sm ${isFocused === 'password' ? 'opacity-70' : ''}`} />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setIsFocused('password')}
                  onBlur={() => setIsFocused(null)}
                  placeholder="Enter your password"
                  className="relative bg-purple-950/30 border-purple-500/20 text-purple-100 placeholder:text-purple-400/40 h-12 rounded-xl focus:border-purple-500/50 focus:ring-purple-500/20 transition-all"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm backdrop-blur-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 hover:from-purple-500 hover:via-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-900/30 hover:shadow-purple-800/40 transition-all duration-300 border border-purple-400/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Access Dashboard
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-purple-500/10">
            <p className="text-center text-purple-400/40 text-xs flex items-center justify-center gap-2">
              <Shield className="w-3 h-3" />
              Protected by Controlyze Authentication
              <Shield className="w-3 h-3" />
            </p>
          </div>
        </div>
      </div>

      {/* Add keyframe animation for floating particles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) translateX(20px);
            opacity: 0;
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
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
