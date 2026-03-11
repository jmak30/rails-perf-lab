import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';
import type { TaskAttributes, UserAttributes, Resource, PaginationMeta, ProfilingData } from '../api/types';

type Tab = 'tasks' | 'users';

export default function DataExplorer() {
  const [tab, setTab] = useState<Tab>('tasks');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Data Explorer</h2>
        <p className="text-zinc-400 text-sm">Browse V2 API data with live profiling</p>
      </div>

      <div className="flex gap-2">
        {(['tasks', 'users'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
              tab === t
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'tasks' ? <TasksView /> : <UsersView />}
    </div>
  );
}

function TasksView() {
  const [tasks, setTasks] = useState<Resource<TaskAttributes>[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [profiling, setProfiling] = useState<ProfilingData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadTasks = useCallback(async (cursor?: number) => {
    setLoading(true);
    const params = cursor ? `?cursor=${cursor}&page_size=20&profile=true` : '?page_size=20&profile=true';
    const res = await apiFetch<{ data: Resource<TaskAttributes>[]; meta: PaginationMeta; profiling: ProfilingData }>(
      `/v2/tasks${params}`
    );
    const body = res.data;

    if (cursor) {
      setTasks((prev) => [...prev, ...body.data]);
    } else {
      setTasks(body.data);
    }
    setMeta(body.meta);
    setProfiling(body.profiling);
    setLoading(false);
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  return (
    <div className="space-y-4">
      <ProfilingBadge profiling={profiling} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-zinc-700 text-zinc-400">
              <th className="py-2 px-3">ID</th>
              <th className="py-2 px-3">Title</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Due Date</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-b border-zinc-800 text-zinc-300 hover:bg-zinc-800/50">
                <td className="py-2 px-3 text-zinc-500">{task.id}</td>
                <td className="py-2 px-3">{task.attributes.title}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    task.attributes.completed
                      ? 'bg-green-900/50 text-green-400'
                      : 'bg-yellow-900/50 text-yellow-400'
                  }`}>
                    {task.attributes.completed ? 'Done' : 'Pending'}
                  </span>
                </td>
                <td className="py-2 px-3 text-zinc-400">{task.attributes.due_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta?.next_cursor && (
        <button
          onClick={() => loadTasks(meta.next_cursor!)}
          disabled={loading}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded text-sm transition-colors"
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}

function UsersView() {
  const [users, setUsers] = useState<Resource<UserAttributes>[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [profiling, setProfiling] = useState<ProfilingData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(async (cursor?: number) => {
    setLoading(true);
    const params = cursor ? `?cursor=${cursor}&page_size=20&profile=true` : '?page_size=20&profile=true';
    const res = await apiFetch<{ data: Resource<UserAttributes>[]; meta: PaginationMeta; profiling: ProfilingData }>(
      `/v2/users${params}`
    );
    const body = res.data;

    if (cursor) {
      setUsers((prev) => [...prev, ...body.data]);
    } else {
      setUsers(body.data);
    }
    setMeta(body.meta);
    setProfiling(body.profiling);
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  return (
    <div className="space-y-4">
      <ProfilingBadge profiling={profiling} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-zinc-700 text-zinc-400">
              <th className="py-2 px-3">ID</th>
              <th className="py-2 px-3">Name</th>
              <th className="py-2 px-3">Email</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-zinc-800 text-zinc-300 hover:bg-zinc-800/50">
                <td className="py-2 px-3 text-zinc-500">{user.id}</td>
                <td className="py-2 px-3">{user.attributes.name}</td>
                <td className="py-2 px-3 text-zinc-400">{user.attributes.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta?.next_cursor && (
        <button
          onClick={() => loadUsers(meta.next_cursor!)}
          disabled={loading}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded text-sm transition-colors"
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}

// Small inline profiling badge shown above data tables
function ProfilingBadge({ profiling }: { profiling: ProfilingData | null }) {
  if (!profiling) return null;

  return (
    <div className="flex flex-wrap gap-3 text-xs">
      <span className="bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded border border-zinc-700">
        {profiling.duration_ms}ms total
      </span>
      <span className="bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded border border-zinc-700">
        {profiling.sql.query_count} queries ({profiling.sql.total_duration_ms}ms)
      </span>
      <span className="bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded border border-zinc-700">
        Cache: {profiling.cache.hits} hits / {profiling.cache.misses} misses
      </span>
    </div>
  );
}
