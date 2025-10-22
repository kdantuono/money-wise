-- Add constraint to ensure budget end_date >= start_date

ALTER TABLE budgets
ADD CONSTRAINT chk_budget_date_range
CHECK (end_date >= start_date);

COMMENT ON CONSTRAINT chk_budget_date_range ON budgets IS
'Ensures budget period is valid (end date must be on or after start date)';
