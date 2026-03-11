class ApplicationController < ActionController::API
  around_action :profile_request, if: -> { params[:profile] == "true" }
  after_action :set_rate_limit_headers

  rescue_from ActiveRecord::RecordNotFound do |e|
    render json: { error: e.message }, status: :not_found
  end

  rescue_from ActiveRecord::RecordInvalid do |e|
    render json: { error: e.message, details: e.record.errors }, status: :unprocessable_entity
  end

  rescue_from ActionController::ParameterMissing do |e|
    render json: { error: e.message }, status: :bad_request
  end

  rescue_from StandardError do |e|
    Rails.logger.error("#{e.class}: #{e.message}\n#{e.backtrace&.first(5)&.join("\n")}")
    render json: { error: "Internal server error" }, status: :internal_server_error
  end

  private

  def set_rate_limit_headers
    match_data = request.env["rack.attack.throttle_data"]&.dig("req/ip")
    return unless match_data

    now = match_data[:epoch_time]
    remaining = [ match_data[:limit] - match_data[:count], 0 ].max
    reset_at = now + (match_data[:period] - (now % match_data[:period]))

    response.set_header("X-RateLimit-Limit", match_data[:limit].to_s)
    response.set_header("X-RateLimit-Remaining", remaining.to_s)
    response.set_header("X-RateLimit-Reset", reset_at.to_s)
  end

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
