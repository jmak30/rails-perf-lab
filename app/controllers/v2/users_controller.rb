# V2: Optimized — cursor pagination, caching, HTTP conditional GETs.
module V2
  class UsersController < ApplicationController
    before_action :set_user, only: [ :show ]

    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100

    def index
      users = User.all

      if params[:cursor].present?
        users = users.where("id > ?", params[:cursor])
      end

      page_size = page_size_param
      users = users.order(:id).limit(page_size + 1)

      has_next = users.length > page_size
      users = users.first(page_size)

      serialized_users = users.map do |user|
        Rails.cache.fetch(user.cache_key_with_version) do
          UserSerializer.new(user).serializable_hash[:data]
        end
      end

      result = { data: serialized_users }
      result[:meta] = {
        next_cursor: has_next ? users.last.id : nil,
        page_size: page_size
      }

      render json: result
    end

    def show
      if stale?(etag: @user, last_modified: @user.updated_at)
        json = Rails.cache.fetch(@user.cache_key_with_version) do
          UserSerializer.new(@user).serializable_hash
        end

        render json: json
      end
    end

    private

    def set_user
      @user = User.find(params[:id])
    rescue ActiveRecord::RecordNotFound
      head :not_found
    end

    def page_size_param
      size = (params[:page_size] || DEFAULT_PAGE_SIZE).to_i
      size.clamp(1, MAX_PAGE_SIZE)
    end
  end
end
