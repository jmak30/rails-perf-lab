class TaskSerializer
  include JSONAPI::Serializer
  attributes :title, :completed, :due_date
  belongs_to :user
end
