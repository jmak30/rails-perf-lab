module V2
  class TasksController < ApplicationController
    before_action :set_task, only: [ :show, :update, :destroy ]

    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100

    def index
      tasks = if params[:user_id]
        Task.where(user_id: params[:user_id]).includes(:user)
      else
        Task.includes(:user)
      end

      # Filter by status — uses the (user_id, completed) composite index
      if params[:completed].present?
        tasks = tasks.by_status(params[:completed] == "true")
      end

      # Filter overdue tasks — uses the due_date index
      if params[:overdue] == "true"
        tasks = tasks.overdue
      end

      if params[:cursor].present?
        tasks = tasks.where("id > ?", params[:cursor])
      end

      page_size = page_size_param
      tasks = tasks.order(:id).limit(page_size + 1)

      has_next = tasks.length > page_size
      tasks = tasks.first(page_size)

      serialized_tasks = tasks.map do |task|
        Rails.cache.fetch(task.cache_key_with_version) do
          TaskSerializer.new(task).serializable_hash[:data]
        end
      end

      result = { data: serialized_tasks }
      result[:meta] = {
        next_cursor: has_next ? tasks.last.id : nil,
        page_size: page_size
      }

      render json: result
    end

    def show
      if stale?(etag: @task, last_modified: @task.updated_at)
        json = Rails.cache.fetch(@task.cache_key_with_version) do
          TaskSerializer.new(@task).serializable_hash
        end

        render json: json
      end
    end

    def create
      task = Task.create!(task_params)
      render json: TaskSerializer.new(task).serializable_hash, status: :created
    end

    def update
      @task.update!(task_params)
      render json: TaskSerializer.new(@task).serializable_hash, status: :ok
    end

    def destroy
      @task.destroy!
      head :no_content
    end

    private

    def set_task
      @task = Task.find(params[:id])
    rescue ActiveRecord::RecordNotFound
      head :not_found
    end

    def task_params
      params.require(:task).permit(:title, :due_date, :completed, :user_id)
    end

    def page_size_param
      size = (params[:page_size] || DEFAULT_PAGE_SIZE).to_i
      size.clamp(1, MAX_PAGE_SIZE)
    end
  end
end
