CREATE INDEX "idx_tasks_plan_id_type"
  ON "tasks" ("plan_id", "type");

CREATE INDEX "idx_tasks_plan_id_done_at"
  ON "tasks" ("plan_id", "done_at");

CREATE INDEX "idx_tasks_plan_id_created_at_id"
  ON "tasks" ("plan_id", "created_at", "id");
