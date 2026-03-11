class Rack::Attack
  # Throttle all requests by IP — 300 requests per 5 minutes
  throttle("req/ip", limit: 300, period: 5.minutes) do |req|
    req.ip
  end

  # Stricter throttle for API index endpoints (expensive queries)
  throttle("api_index/ip", limit: 60, period: 1.minute) do |req|
    if req.path.match?(%r{^/v[12]/(tasks|users)$}) && req.get?
      req.ip
    end
  end

  # Throttle POST/PATCH/DELETE — 30 writes per minute
  throttle("api_writes/ip", limit: 30, period: 1.minute) do |req|
    if req.path.start_with?("/v1/", "/v2/") && !req.get?
      req.ip
    end
  end

  # Block requests with suspicious patterns
  blocklist("fail2ban/aggressive") do |req|
    Rack::Attack::Allow2Ban.filter(req.ip, maxretry: 10, findtime: 1.minute, bantime: 10.minutes) do
      req.path.match?(%r{\.\.(\/|\\)}) || req.path.match?(%r{\.(php|asp|aspx|jsp|cgi)$})
    end
  end

  # Custom throttle response with rate limit headers
  self.throttled_responder = lambda do |request|
    match_data = request.env["rack.attack.match_data"]
    now = match_data[:epoch_time]
    headers = {
      "Content-Type" => "application/json",
      "Retry-After" => (match_data[:period] - (now % match_data[:period])).to_s,
      "X-RateLimit-Limit" => match_data[:limit].to_s,
      "X-RateLimit-Remaining" => "0",
      "X-RateLimit-Reset" => (now + (match_data[:period] - (now % match_data[:period]))).to_s
    }
    body = { error: "Rate limit exceeded. Retry later." }.to_json
    [429, headers, [body]]
  end

  # Always allow localhost in development (so benchmarks aren't throttled)
  safelist("allow-localhost") do |req|
    req.ip == "127.0.0.1" || req.ip == "::1"
  end
end
