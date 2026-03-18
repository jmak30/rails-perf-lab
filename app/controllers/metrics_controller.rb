class MetricsController < ActionController::API
  def index
    output = Prometheus::Client::Formats::Text.marshal(PROMETHEUS_REGISTRY)
    render plain: output, content_type: "text/plain; version=0.0.4; charset=utf-8"
  end
end
