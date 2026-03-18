class PrometheusMetricsMiddleware
  def initialize(app)
    @app = app
  end

  def call(env)
    return @app.call(env) if env["PATH_INFO"] == "/metrics"

    sql_count = 0
    subscriber = ActiveSupport::Notifications.subscribe("sql.active_record") do |event|
      sql_count += 1 unless event.payload[:name] == "SCHEMA"
    end

    start = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    status, headers, response = @app.call(env)
    duration = Process.clock_gettime(Process::CLOCK_MONOTONIC) - start

    ActiveSupport::Notifications.unsubscribe(subscriber)

    method = env["REQUEST_METHOD"]
    path = normalize_path(env)

    HTTP_REQUEST_TOTAL.increment(labels: { method: method, path: path, status: status.to_s })
    HTTP_REQUEST_DURATION.observe(duration, labels: { method: method, path: path })
    SQL_QUERIES_TOTAL.increment(by: sql_count, labels: { method: method, path: path })

    if status >= 400
      HTTP_ERROR_TOTAL.increment(labels: { method: method, path: path, status: status.to_s })
    end

    [status, headers, response]
  end

  private

  def normalize_path(env)
    route = Rails.application.routes.recognize_path(
      env["PATH_INFO"],
      method: env["REQUEST_METHOD"]
    )
    "#{route[:controller]}##{route[:action]}"
  rescue ActionController::RoutingError
    env["PATH_INFO"]
  end
end
