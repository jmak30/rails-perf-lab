if defined?(Rack::MiniProfiler)
  Rack::MiniProfiler.config.storage = Rack::MiniProfiler::MemoryStore
  Rack::MiniProfiler.config.pre_authorize_cb = ->(_env) { true }
  Rack::MiniProfiler.config.skip_paths = []
end
