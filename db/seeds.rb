require "benchmark"

USER_COUNT = 1_000
TASK_COUNT = 10_000
COMMENT_COUNT = 5_000
BATCH_SIZE = 5_000

puts "Clearing existing data..."
Comment.delete_all
Task.delete_all
User.delete_all

now = Time.current

puts "\nSeeding #{USER_COUNT} users..."
user_time = Benchmark.measure {
  user_records = Array.new(USER_COUNT) { |i|
    {
      name: "User #{i + 1}",
      email: "user#{i + 1}@example.com",
      created_at: now,
      updated_at: now
    }
  }
  user_records.each_slice(BATCH_SIZE) { |batch| User.insert_all(batch) }
}
puts "  -> #{user_time.real.round(2)}s"

user_ids = User.pluck(:id)

puts "\nSeeding #{TASK_COUNT} tasks..."
task_time = Benchmark.measure {
  task_records = Array.new(TASK_COUNT) { |i|
    {
      title: "Task #{i + 1}",
      completed: [true, false].sample,
      due_date: Date.today + rand(-30..30),
      user_id: user_ids.sample,
      created_at: now,
      updated_at: now
    }
  }
  task_records.each_slice(BATCH_SIZE) { |batch| Task.insert_all(batch) }
}
puts "  -> #{task_time.real.round(2)}s"

task_ids = Task.pluck(:id)

puts "\nSeeding #{COMMENT_COUNT} comments..."
comment_time = Benchmark.measure {
  comment_records = Array.new(COMMENT_COUNT) { |i|
    {
      body: "Comment body #{i + 1}",
      task_id: task_ids.sample,
      created_at: now,
      updated_at: now
    }
  }
  comment_records.each_slice(BATCH_SIZE) { |batch| Comment.insert_all(batch) }
}
puts "  -> #{comment_time.real.round(2)}s"

total = user_time.real + task_time.real + comment_time.real
puts "\nDone! Total seed time: #{total.round(2)}s"
puts "  Users:    #{User.count}"
puts "  Tasks:    #{Task.count}"
puts "  Comments: #{Comment.count}"
