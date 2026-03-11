class AddPerformanceIndexes < ActiveRecord::Migration[8.1]
  def change
    # Replaces the single-column user_id index. The composite index covers
    # both "WHERE user_id = ?" and "WHERE user_id = ? AND completed = ?"
    # queries via leftmost prefix matching.
    remove_index :tasks, :user_id
    add_index :tasks, [ :user_id, :completed ]

    add_index :tasks, :due_date
    add_index :users, :email, unique: true
  end
end
