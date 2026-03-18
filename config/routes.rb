Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :v1 do
    resources :tasks, only: [ :index, :show, :create, :update, :destroy ]
    resources :users, only: [ :index, :show ] do
      resources :tasks, only: [ :index ]
    end
  end

  namespace :v2 do
    resources :tasks, only: [ :index, :show, :create, :update, :destroy ]
    resources :users, only: [ :index, :show ] do
      resources :tasks, only: [ :index ]
    end
  end

  get "metrics", to: "metrics#index"
  delete "profiler/cache", to: "profiler#clear_cache"
  get "profiler/:id", to: "profiler#show"
end
