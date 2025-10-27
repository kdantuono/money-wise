-- Add constraint to ensure transaction amounts are non-negative
-- Architectural decision: amounts stored as absolute values, type field determines direction

ALTER TABLE transactions
ADD CONSTRAINT chk_transaction_amount_positive
CHECK (amount >= 0);

COMMENT ON CONSTRAINT chk_transaction_amount_positive ON transactions IS
'Ensures amounts are stored as absolute values (>= 0). Transaction type (DEBIT/CREDIT) determines flow direction.';
