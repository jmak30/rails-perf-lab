module V1
  class TasksController < ApplicationController
    before_action :set_task, only: [ :show, :update, :destroy ]

    def index
      tasks = Task.all.includes([ :user ])
      render json: TaskSerializer.new(tasks).serializable_hash
    end

    def show
      render json: TaskSerializer.new(@task).serializable_hash
    end

    def create
      task = Task.create!(task_params)
      render json: TaskSerializer.new(task).serializable_hash
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
      @task = Task.find_by!(id: params[:id])
    rescue ActiveRecord::RecordNotFound
      head :not_found
    end

    def task_params
      params.require(:task).permit([ :title, :due_date, :completed ])
    end
  end
end
