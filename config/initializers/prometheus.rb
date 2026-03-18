require "prometheus/client"
require "prometheus/client/formats/text"

PROMETHEUS_REGISTRY = Prometheus::Client.registry

HTTP_REQUEST_TOTAL = PROMETHEUS_REGISTRY.counter(
  :http_requests_total,
  docstring: "Total HTTP requests",
  labels: [:method, :path, :status]
)

HTTP_REQUEST_DURATION = PROMETHEUS_REGISTRY.histogram(
  :http_request_duration_seconds,
  docstring: "HTTP request duration in seconds",
  labels: [:method, :path],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
)

HTTP_ERROR_TOTAL = PROMETHEUS_REGISTRY.counter(
  :http_errors_total,
  docstring: "Total HTTP error responses (4xx and 5xx)",
  labels: [:method, :path, :status]
)

SQL_QUERIES_TOTAL = PROMETHEUS_REGISTRY.counter(
  :sql_queries_total,
  docstring: "Total SQL queries executed",
  labels: [:method, :path]
)
