# Rails Perf Lab

A Rails API performance optimization showcase. The app exposes the same endpoints in two versions — V1 (unoptimized) and V2 (optimized) — with a React frontend that visualizes the performance difference using rack-mini-profiler and custom instrumentation.

![Performance Comparison Dashboard](screenshot.png)

## What it demonstrates

- **Cursor-based pagination** vs loading all records
- **Per-record caching** with `Rails.cache.fetch` and `cache_key_with_version`
- **HTTP conditional GETs** with `stale?` / ETags
- **Eager loading** to prevent N+1 queries
- **Bulk seeding** with `insert_all` at scale (160K records)
- **rack-mini-profiler** integration for timing trees, SQL stack traces, and row counts
- **Custom request profiling** via `ActiveSupport::Notifications`

## Tech stack

- Ruby 3.4 / Rails 8.1 (API-only)
- PostgreSQL
- React + TypeScript + Vite
- Tailwind CSS + Recharts
- rack-mini-profiler, Bullet

## Setup

```bash
# Install dependencies
bundle install
cd frontend && npm install && cd ..

# Create and seed the database (1K users, 10K tasks, 5K comments)
bin/rails db:create db:migrate db:seed

# Enable caching in development
bin/rails dev:cache
```

## Running

```bash
# Terminal 1: Rails API
bin/rails server

# Terminal 2: React frontend
cd frontend && npx vite
```

Open `http://localhost:5173/`

## Endpoints

All endpoints are available under `/v1` (unoptimized) and `/v2` (optimized):

| Endpoint | Actions |
|---|---|
| `/tasks` | index, show, create, update, destroy |
| `/users` | index, show |
| `/users/:id/tasks` | index |

Append `?profile=true` to any request to get inline profiling data (duration, SQL queries, cache stats).

## Benchmark

```bash
bin/rails perf:benchmark
```

Runs all endpoints against both V1 and V2 with cold/warm cache comparisons and prints a timing table.
