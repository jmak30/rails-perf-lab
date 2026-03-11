class ApplicationController < ActionController::API
  around_action :profile_request, if: -> { params[:profile] == "true" }

  private

  def profile_request
    sql_events = []
    cache_events = { hits: 0, misses: 0 }

    sql_subscriber = ActiveSupport::Notifications.subscribe("sql.active_record") do |event|
      next if event.payload[:name] == "SCHEMA"
      sql_events << {
        name: event.payload[:name],
        duration_ms: event.duration.round(2),
        sql: event.payload[:sql]
      }
    end

    cache_read_subscriber = ActiveSupport::Notifications.subscribe("cache_read.active_support") do |*, payload|
      if payload[:hit]
        cache_events[:hits] += 1
      else
        cache_events[:misses] += 1
      end
    end

    start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    yield
    duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time) * 1000).round(2)

    ActiveSupport::Notifications.unsubscribe(sql_subscriber)
    ActiveSupport::Notifications.unsubscribe(cache_read_subscriber)

    if response.content_type&.include?("application/json")
      body = JSON.parse(response.body)
      body["profiling"] = {
        duration_ms: duration_ms,
        sql: {
          query_count: sql_events.size,
          total_duration_ms: sql_events.sum { |e| e[:duration_ms] || 0 }.round(2),
          queries: sql_events
        },
        cache: cache_events
      }
      response.body = body.to_json
    end
  end
end
