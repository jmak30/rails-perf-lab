require "benchmark"
require "timeout"

namespace :perf do
  desc "Benchmark V1 vs V2 API endpoints and report timing + query counts"
  task benchmark: :environment do
    app = Rails.application
    request = Rack::MockRequest.new(app)

    sample_task = Task.first
    sample_user = User.first

    unless sample_task && sample_user
      puts "No data found. Run `rails db:seed` first."
      exit 1
    end

    endpoint_timeout = 60
    headers = { "CONTENT_TYPE" => "application/json", "HTTP_HOST" => "localhost" }

    run_endpoint = ->(endpoint) {
      query_count = 0
      subscriber = ActiveSupport::Notifications.subscribe("sql.active_record") do |*, payload|
        query_count += 1 unless payload[:name] == "SCHEMA"
      end

      status = nil
      timed_out = false

      time = Benchmark.measure do
        Timeout.timeout(endpoint_timeout) do
          response = case endpoint[:method]
          when :get
            request.get(endpoint[:path], headers)
          when :post
            request.post(endpoint[:path], headers.merge(input: endpoint[:body].to_json))
          when :patch
            request.patch(endpoint[:path], headers.merge(input: endpoint[:body].to_json))
          end

          status = response.status
        end
      rescue Timeout::Error
        timed_out = true
      end

      ActiveSupport::Notifications.unsubscribe(subscriber)
      ms = (time.real * 1000).round(1)

      { ms: ms, queries: query_count, status: status, timed_out: timed_out }
    }

    format_result = ->(name, r) {
      if r[:timed_out]
        format("%-27s %10s %10s %8s", name, ">#{endpoint_timeout}s", r[:queries], "TIMEOUT")
      else
        format("%-27s %10s %10d %8d", name, r[:ms], r[:queries], r[:status])
      end
    }

    endpoints = [
      { name: "GET /tasks",           method: :get, path_v1: "/v1/tasks",          path_v2: "/v2/tasks" },
      { name: "GET /tasks/:id",       method: :get, path_v1: "/v1/tasks/#{sample_task.id}", path_v2: "/v2/tasks/#{sample_task.id}" },
      { name: "GET /users",           method: :get, path_v1: "/v1/users",          path_v2: "/v2/users" },
      { name: "GET /users/:id",       method: :get, path_v1: "/v1/users/#{sample_user.id}", path_v2: "/v2/users/#{sample_user.id}" },
      { name: "GET /users/:id/tasks", method: :get, path_v1: "/v1/users/#{sample_user.id}/tasks", path_v2: "/v2/users/#{sample_user.id}/tasks" },
      { name: "POST /tasks",
        method: :post,
        path_v1: "/v1/tasks",
        path_v2: "/v2/tasks",
        body_v1: { task: { title: "Bench task", due_date: Date.today, completed: false } },
        body_v2: { task: { title: "Bench task", due_date: Date.today, completed: false, user_id: sample_user.id } } },
      { name: "PATCH /tasks/:id",
        method: :patch,
        path_v1: "/v1/tasks/#{sample_task.id}",
        path_v2: "/v2/tasks/#{sample_task.id}",
        body_v1: { task: { title: "Updated" } },
        body_v2: { task: { title: "Updated" } } }
    ]

    Rails.cache.clear

    puts "=" * 78
    puts "  V1 vs V2 Benchmark (with caching)"
    puts "  #{Task.count} tasks | #{User.count} users | #{Comment.count} comments"
    puts "  Timeout per endpoint: #{endpoint_timeout}s"
    puts "=" * 78
    puts format("%-27s %10s %10s %8s", "Endpoint", "Time (ms)", "Queries", "Status")

    endpoints.each do |ep|
      puts "-" * 78

      v1 = run_endpoint.call({ method: ep[:method], path: ep[:path_v1], body: ep[:body_v1] })
      puts format_result.call("V1 #{ep[:name]}", v1)

      v2_cold = run_endpoint.call({ method: ep[:method], path: ep[:path_v2], body: ep[:body_v2] })
      puts format_result.call("V2 #{ep[:name]} (cold)", v2_cold)

      if ep[:method] == :get
        v2_warm = run_endpoint.call({ method: ep[:method], path: ep[:path_v2], body: ep[:body_v2] })
        puts format_result.call("V2 #{ep[:name]} (warm)", v2_warm)
      end
    end

    puts "=" * 78
  end
end
