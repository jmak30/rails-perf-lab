import { useState } from 'react';
import type {
  MiniProfilerResult,
  MiniProfilerTiming,
  MiniProfilerSqlTiming,
} from '../api/miniProfiler';
import { decodeSql } from '../api/miniProfiler';

interface Props {
  label: string;
  result: MiniProfilerResult | null;
  loading?: boolean;
  error?: string;
}

export default function MiniProfilerPanel({ label, result, loading, error }: Props) {
  if (loading) {
    return (
      <div className="bg-zinc-800 rounded-lg p-5 border border-zinc-700">
        <h3 className="text-lg font-semibold text-white mb-2">{label}</h3>
        <p className="text-zinc-400 text-sm">Loading profiler data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-800 rounded-lg p-5 border border-zinc-700">
        <h3 className="text-lg font-semibold text-white mb-2">{label}</h3>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!result) return null;

  const sqlTime = result.duration_milliseconds_in_sql;
  const appTime = result.duration_milliseconds - sqlTime;
  const sqlPct = ((sqlTime / result.duration_milliseconds) * 100).toFixed(0);
  const appPct = ((appTime / result.duration_milliseconds) * 100).toFixed(0);

  return (
    <div className="bg-zinc-800 rounded-lg p-5 border border-zinc-700 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{label}</h3>
        <span className="text-xs text-zinc-500 font-mono">{result.id}</span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total" value={`${result.duration_milliseconds.toFixed(1)}ms`} />
        <StatCard label="SQL Queries" value={String(result.sql_count)} />
        <StatCard label="SQL Time" value={`${sqlTime.toFixed(1)}ms`} />
      </div>

      {/* Time breakdown bar */}
      <div>
        <p className="text-xs text-zinc-400 mb-1">Time breakdown</p>
        <div className="flex h-6 rounded overflow-hidden">
          <div
            className="bg-blue-600 flex items-center justify-center text-xs text-white"
            style={{ width: `${appPct}%`, minWidth: appTime > 0 ? '40px' : 0 }}
          >
            App {appPct}%
          </div>
          <div
            className="bg-amber-600 flex items-center justify-center text-xs text-white"
            style={{ width: `${sqlPct}%`, minWidth: sqlTime > 0 ? '40px' : 0 }}
          >
            SQL {sqlPct}%
          </div>
        </div>
      </div>

      {/* Timing tree */}
      <div>
        <p className="text-xs text-zinc-400 mb-2">Timing tree</p>
        <TimingNode timing={result.root} totalMs={result.duration_milliseconds} />
      </div>

      {/* Duplicate query warning */}
      {result.has_duplicate_sql_timings && (
        <div className="bg-red-900/30 border border-red-800 rounded p-3">
          <p className="text-red-400 text-sm font-medium">Duplicate queries detected</p>
          <p className="text-red-400/70 text-xs mt-1">
            The same query was executed multiple times — this often indicates an N+1 problem.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900 rounded p-3 text-center">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function TimingNode({ timing, totalMs }: { timing: MiniProfilerTiming; totalMs: number }) {
  const pct = ((timing.duration_milliseconds / totalMs) * 100).toFixed(0);
  const ownTime = timing.duration_without_children_milliseconds;

  return (
    <div className="border-l-2 border-zinc-700 pl-3 space-y-2">
      <div className="flex items-start gap-2">
        {/* Timing bar proportional to total request time */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-300 truncate">{timing.name}</span>
            <span className="text-zinc-500 text-xs whitespace-nowrap">
              {timing.duration_milliseconds.toFixed(1)}ms ({pct}%)
            </span>
          </div>
          {!timing.is_root && ownTime !== timing.duration_milliseconds && (
            <p className="text-xs text-zinc-600">
              own time: {ownTime.toFixed(1)}ms
            </p>
          )}
          {/* Proportional bar */}
          <div className="h-1.5 bg-zinc-900 rounded mt-1">
            <div
              className="h-full bg-blue-500 rounded"
              style={{ width: `${Math.max(Number(pct), 1)}%` }}
            />
          </div>
        </div>
      </div>

      {/* SQL timings for this node */}
      {timing.sql_timings.length > 0 && (
        <div className="space-y-1.5 ml-2">
          {timing.sql_timings.map((sql, i) => (
            <SqlTimingRow key={i} sql={sql} />
          ))}
        </div>
      )}

      {/* Recurse into children */}
      {timing.children.map((child) => (
        <TimingNode key={child.id} timing={child} totalMs={totalMs} />
      ))}
    </div>
  );
}

function SqlTimingRow({ sql }: { sql: MiniProfilerSqlTiming }) {
  const [expanded, setExpanded] = useState(false);
  const decodedSql = decodeSql(sql.formatted_command_string);

  return (
    <div
      className={`text-xs rounded p-2 cursor-pointer transition-colors ${
        sql.is_duplicate
          ? 'bg-red-900/20 border border-red-900/50'
          : 'bg-zinc-900 border border-zinc-800'
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {sql.is_duplicate && (
            <span className="bg-red-800 text-red-200 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0">
              DUP
            </span>
          )}
          <span className="text-zinc-400 truncate font-mono">
            {sql.class_name && <span className="text-zinc-500">{sql.class_name}: </span>}
            {decodedSql.slice(0, 80)}{decodedSql.length > 80 ? '...' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-zinc-500">{sql.row_count} rows</span>
          <span className="text-amber-400 font-medium">{sql.duration_milliseconds.toFixed(1)}ms</span>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          <pre className="text-zinc-300 font-mono whitespace-pre-wrap break-all bg-zinc-950 rounded p-2">
            {decodedSql}
          </pre>
          {sql.stack_trace_snippet && (
            <div>
              <p className="text-zinc-600 mb-0.5">Stack trace:</p>
              <pre className="text-zinc-500 font-mono whitespace-pre-wrap text-[10px]">
                {sql.stack_trace_snippet}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
