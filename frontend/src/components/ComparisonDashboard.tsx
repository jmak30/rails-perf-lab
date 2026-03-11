import { useState } from 'react';
import { apiFetch } from '../api/client';
import type { ProfilingData } from '../api/types';
import type { MiniProfilerResult } from '../api/miniProfiler';
import { extractMiniProfilerId, fetchMiniProfilerResult } from '../api/miniProfiler';
import MiniProfilerPanel from './MiniProfilerPanel';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';

interface ComparisonResult {
  v1: ProfilingData | null;
  v2Cold: ProfilingData | null;
  v2Warm: ProfilingData | null;
  v1Error?: string;
  // Mini-profiler deep data
  v1MiniProfiler: MiniProfilerResult | null;
  v2ColdMiniProfiler: MiniProfilerResult | null;
  v2WarmMiniProfiler: MiniProfilerResult | null;
}

const ENDPOINTS = [
  { label: 'Tasks Index', v1: '/v1/tasks', v2: '/v2/tasks' },
  { label: 'Users Index', v1: '/v1/users', v2: '/v2/users' },
  { label: 'Task Show', v1: '/v1/tasks/1', v2: '/v2/tasks/1' },
  { label: 'User Show', v1: '/v1/users/1', v2: '/v2/users/1' },
];

export default function ComparisonDashboard() {
  const [selectedEndpoint, setSelectedEndpoint] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runComparison = async () => {
    setLoading(true);
    setResult(null);

    await fetch('/profiler/cache', { method: 'DELETE' });

    const ep = ENDPOINTS[selectedEndpoint];
    const separator = ep.v1.includes('?') ? '&' : '?';
    const pageSuffix = ep.label.includes('Index') ? `${separator}page_size=${pageSize}` : '';

    let v1Profiling: ProfilingData | null = null;
    let v1MiniProfiler: MiniProfilerResult | null = null;
    let v1Error: string | undefined;

    // V1 request — may timeout or return 500 on large datasets
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const v1Url = `${ep.v1}${pageSuffix}`;
      const url = new URL(v1Url, window.location.origin);
      url.searchParams.set('profile', 'true');

      const v1Response = await fetch(url.toString(), {
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      // Extract mini-profiler ID from V1 response
      const v1MpId = extractMiniProfilerId(v1Response.headers);

      if (v1Response.ok) {
        const v1Data = await v1Response.json();
        v1Profiling = v1Data.profiling || null;
      } else {
        v1Error = `HTTP ${v1Response.status}`;
      }

      // Fetch mini-profiler data even if the request returned an error
      // status — the profiler still captures timing data
      if (v1MpId) {
        v1MiniProfiler = await fetchMiniProfilerResult(v1MpId);
      }
    } catch {
      v1Error = 'Timeout (>30s)';
    }

    // V2 cold cache
    const v2ColdRes = await apiFetch<Record<string, unknown>>(
      `${ep.v2}${pageSuffix}`, { profile: true }
    );
    const v2ColdProfiling = v2ColdRes.data.profiling as ProfilingData | undefined;
    const v2ColdMpId = extractMiniProfilerId(v2ColdRes.headers);
    const v2ColdMiniProfiler = v2ColdMpId
      ? await fetchMiniProfilerResult(v2ColdMpId)
      : null;

    // V2 warm cache — same request again
    const v2WarmRes = await apiFetch<Record<string, unknown>>(
      `${ep.v2}${pageSuffix}`, { profile: true }
    );
    const v2WarmProfiling = v2WarmRes.data.profiling as ProfilingData | undefined;
    const v2WarmMpId = extractMiniProfilerId(v2WarmRes.headers);
    const v2WarmMiniProfiler = v2WarmMpId
      ? await fetchMiniProfilerResult(v2WarmMpId)
      : null;

    setResult({
      v1: v1Profiling,
      v2Cold: v2ColdProfiling || null,
      v2Warm: v2WarmProfiling || null,
      v1Error,
      v1MiniProfiler,
      v2ColdMiniProfiler,
      v2WarmMiniProfiler,
    });
    setLoading(false);
  };

  // Build chart data from results
  const chartData = result ? [
    {
      name: 'V1',
      duration: result.v1?.duration_ms ?? null,
      label: result.v1Error || `${result.v1?.duration_ms}ms`,
    },
    {
      name: 'V2 (cold)',
      duration: result.v2Cold?.duration_ms ?? 0,
      label: `${result.v2Cold?.duration_ms}ms`,
    },
    {
      name: 'V2 (warm)',
      duration: result.v2Warm?.duration_ms ?? 0,
      label: `${result.v2Warm?.duration_ms}ms`,
    },
  ] : [];

  const barColors = ['#ef4444', '#f59e0b', '#22c55e'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Performance Comparison</h2>
        <p className="text-zinc-400 text-sm">Compare V1 (unoptimized) vs V2 (optimized) endpoints side by side</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Endpoint</label>
          <select
            value={selectedEndpoint}
            onChange={(e) => setSelectedEndpoint(Number(e.target.value))}
            className="bg-zinc-800 text-white border border-zinc-700 rounded px-3 py-2"
          >
            {ENDPOINTS.map((ep, i) => (
              <option key={i} value={i}>{ep.label}</option>
            ))}
          </select>
        </div>

        {ENDPOINTS[selectedEndpoint].label.includes('Index') && (
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Page Size</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-zinc-800 text-white border border-zinc-700 rounded px-3 py-2"
            >
              {[10, 20, 50, 100].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={runComparison}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white px-5 py-2 rounded font-medium transition-colors"
        >
          {loading ? 'Running...' : 'Run Comparison'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Top row: timing chart + cache stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Timing Chart */}
            <div className="bg-zinc-800 rounded-lg p-5 border border-zinc-700">
              <h3 className="text-lg font-semibold text-white mb-4">Response Time</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#a1a1aa' }} unit="ms" />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa' }} width={80} />
                  <Tooltip
                    contentStyle={{ background: '#27272a', border: '1px solid #3f3f46', color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="duration" name="Duration (ms)">
                    {chartData.map((_, index) => (
                      <Cell key={index} fill={barColors[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {result.v1Error && (
                <p className="text-red-400 text-sm mt-2">V1 failed: {result.v1Error}</p>
              )}
              {result.v1 && result.v2Warm && (
                <p className="text-green-400 text-sm mt-2">
                  V2 (warm) is {(result.v1.duration_ms / result.v2Warm.duration_ms).toFixed(0)}x faster than V1
                </p>
              )}
            </div>

            <div className="bg-zinc-800 rounded-lg p-5 border border-zinc-700">
              <h3 className="text-lg font-semibold text-white mb-4">Cache Performance</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'V2 (cold)', data: result.v2Cold },
                  { label: 'V2 (warm)', data: result.v2Warm },
                ].map(({ label, data }) => (
                  <div key={label} className="text-center">
                    <p className="text-sm text-zinc-400 mb-2">{label}</p>
                    <div className="flex justify-center gap-4">
                      <div>
                        <p className="text-2xl font-bold text-green-400">{data?.cache.hits ?? 0}</p>
                        <p className="text-xs text-zinc-500">Hits</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-400">{data?.cache.misses ?? 0}</p>
                        <p className="text-xs text-zinc-500">Misses</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mini-profiler deep dive panels */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              rack-mini-profiler Deep Dive
            </h3>
            <p className="text-zinc-400 text-xs mb-4">
              Timing tree, SQL stack traces, row counts, and duplicate query detection from rack-mini-profiler.
              Click any query to expand its full SQL and stack trace.
            </p>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <MiniProfilerPanel
                label="V1 (unoptimized)"
                result={result.v1MiniProfiler}
                error={result.v1Error && !result.v1MiniProfiler ? result.v1Error : undefined}
              />
              <MiniProfilerPanel
                label="V2 (cold cache)"
                result={result.v2ColdMiniProfiler}
              />
              <MiniProfilerPanel
                label="V2 (warm cache)"
                result={result.v2WarmMiniProfiler}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
