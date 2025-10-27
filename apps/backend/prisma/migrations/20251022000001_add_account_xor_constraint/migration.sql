-- Add XOR constraint for Account ownership
-- Ensures account is owned by EITHER user OR family (not both, not neither)

ALTER TABLE accounts
ADD CONSTRAINT chk_account_ownership_xor
CHECK (
  (user_id IS NOT NULL AND family_id IS NULL) OR
  (user_id IS NULL AND family_id IS NOT NULL)
);

-- Add comment explaining constraint
COMMENT ON CONSTRAINT chk_account_ownership_xor ON accounts IS
'Enforces XOR constraint: account must be owned by user OR family (exactly one, not both, not neither)';
