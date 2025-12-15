"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Calendar } from "lucide-react";

interface DailyUptime {
  date: string;
  uptime: number;
  checks: number;
}

interface UptimeData {
  overallUptime: number;
  dailyUptime: DailyUptime[];
  period: {
    days: number;
    from: string;
    to: string;
  };
}

interface UptimeGraphProps {
  className?: string;
}

export function UptimeGraph({ className = "" }: UptimeGraphProps) {
  const [data, setData] = useState<UptimeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(90);

  useEffect(() => {
    async function fetchUptime() {
      try {
        const res = await fetch(`/api/public/uptime?days=${days}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (error) {
        console.error("Failed to fetch uptime:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchUptime();
  }, [days]);

  if (isLoading) {
    return (
      <div className={`rounded-2xl bg-white/5 border border-white/10 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-white/10 rounded mb-4" />
          <div className="h-32 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  if (!data || data.dailyUptime.length === 0) {
    return (
      <div className={`rounded-2xl bg-white/5 border border-white/10 p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <h3 className="text-lg font-semibold text-white">Uptime History</h3>
        </div>
        <p className="text-zinc-500 text-sm">No uptime data recorded yet. Check back later.</p>
      </div>
    );
  }

  // Get the last N days of data for display
  const displayDays = Math.min(days, 90);
  const displayData = data.dailyUptime.slice(-displayDays);

  return (
    <div className={`rounded-2xl bg-white/5 border border-white/10 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <h3 className="text-lg font-semibold text-white">Uptime History</h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>
      </div>

      {/* Overall uptime stat */}
      <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-white/5">
        <div className="flex-1">
          <p className="text-sm text-zinc-400">Overall Uptime</p>
          <p className="text-3xl font-bold text-emerald-400">
            {data.overallUptime.toFixed(2)}%
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Calendar className="h-4 w-4" />
          <span>Last {days} days</span>
        </div>
      </div>

      {/* Uptime bar graph */}
      <div className="relative">
        <div className="flex items-end gap-0.5 h-24">
          {displayData.map((day, i) => {
            const height = day.checks > 0 ? (day.uptime / 100) * 100 : 100;
            const color = getUptimeColor(day.uptime, day.checks);
            
            return (
              <div
                key={day.date}
                className="group relative flex-1 min-w-[2px]"
              >
                <div
                  className={`w-full rounded-t transition-all ${color} hover:opacity-80`}
                  style={{ height: `${height}%` }}
                />
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <p className="font-medium text-white">
                    {formatDate(day.date)}
                  </p>
                  <p className="text-zinc-400">
                    {day.checks > 0 ? `${day.uptime.toFixed(1)}% uptime` : "No data"}
                  </p>
                  {day.checks > 0 && (
                    <p className="text-zinc-500">{day.checks} checks</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-zinc-600">
          <span>{formatDate(displayData[0]?.date)}</span>
          <span>{formatDate(displayData[displayData.length - 1]?.date)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-zinc-400">100%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span className="text-zinc-400">95-99%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span className="text-zinc-400">90-95%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-zinc-400">&lt;90%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-zinc-700" />
          <span className="text-zinc-400">No data</span>
        </div>
      </div>
    </div>
  );
}

function getUptimeColor(uptime: number, checks: number): string {
  if (checks === 0) return "bg-zinc-700";
  if (uptime >= 99.9) return "bg-emerald-500";
  if (uptime >= 95) return "bg-yellow-500";
  if (uptime >= 90) return "bg-orange-500";
  return "bg-red-500";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
