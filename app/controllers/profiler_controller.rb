class ProfilerController < ApplicationController
  def show
    return head :not_found unless defined?(Rack::MiniProfiler)

    result = Rack::MiniProfiler.config.storage_instance.load(params[:id])
    result ? render(json: result) : head(:not_found)
  end

  def clear_cache
    Rails.cache.clear
    render json: { cleared: true }
  end
end
