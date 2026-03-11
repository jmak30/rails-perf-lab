export interface FetchResult<T> {
  data: T;
  miniProfilerIds: string[];
  headers: Headers;
}

export async function apiFetch<T>(
  path: string,
  options: { profile?: boolean; method?: string; body?: unknown } = {}
): Promise<FetchResult<T>> {
  const url = new URL(path, window.location.origin);
  if (options.profile) {
    url.searchParams.set('profile', 'true');
  }

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url.toString(), fetchOptions);
  const data = await response.json();

  const mpHeader = response.headers.get('x-miniprofiler-ids') || '';
  const miniProfilerIds = mpHeader ? mpHeader.split(',') : [];

  return { data, miniProfilerIds, headers: response.headers };
}
