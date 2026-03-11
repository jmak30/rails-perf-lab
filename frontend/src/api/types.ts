export interface TaskAttributes {
  title: string;
  completed: boolean;
  due_date: string;
}

export interface UserAttributes {
  name: string;
  email: string;
}

export interface Resource<T> {
  id: string;
  type: string;
  attributes: T;
  relationships?: Record<string, unknown>;
}

export interface PaginationMeta {
  next_cursor: number | null;
  page_size: number;
}

export interface SqlQuery {
  name: string;
  duration_ms: number;
  sql: string;
}

export interface ProfilingData {
  duration_ms: number;
  sql: {
    query_count: number;
    total_duration_ms: number;
    queries: SqlQuery[];
  };
  cache: {
    hits: number;
    misses: number;
  };
}

export interface ApiResponse<T> {
  data: Resource<T>[] | Resource<T>;
  meta?: PaginationMeta;
  profiling?: ProfilingData;
}
