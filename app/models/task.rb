class Task < ApplicationRecord
  belongs_to :user

  scope :overdue, -> { where(completed: false).where("due_date < ?", Date.current) }
  scope :by_status, ->(completed) { where(completed: completed) }
end
