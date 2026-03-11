export interface MiniProfilerSqlTiming {
  formatted_command_string: string;
  stack_trace_snippet: string;
  duration_milliseconds: number;
  first_fetch_duration_milliseconds: number;
  row_count: number;
  class_name: string | null;
  is_duplicate: boolean;
  start_milliseconds: number;
}

export interface MiniProfilerTiming {
  id: string;
  name: string;
  duration_milliseconds: number;
  duration_without_children_milliseconds: number;
  start_milliseconds: number;
  children: MiniProfilerTiming[];
  sql_timings: MiniProfilerSqlTiming[];
  sql_timings_duration_milliseconds: number;
  depth: number;
  is_root: boolean;
}

export interface MiniProfilerResult {
  id: string;
  name: string;
  request_method: string;
  request_path: string;
  duration_milliseconds: number;
  duration_milliseconds_in_sql: number;
  sql_count: number;
  has_duplicate_sql_timings: boolean;
  root: MiniProfilerTiming;
}

export async function fetchMiniProfilerResult(
  id: string
): Promise<MiniProfilerResult | null> {
  try {
    const response = await fetch(`/profiler/${id}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function extractMiniProfilerId(headers: Headers): string | null {
  const raw = headers.get('x-miniprofiler-ids');
  if (!raw) return null;
  return raw.split(',')[0] || null;
}

export function decodeSql(html: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  return textarea.value;
}
