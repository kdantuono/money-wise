-- Add depth tracking to categories for circular reference prevention
-- Limits hierarchy depth to 3 levels

ALTER TABLE categories ADD COLUMN depth INTEGER NOT NULL DEFAULT 0;

-- Add check constraint to limit hierarchy depth
ALTER TABLE categories
ADD CONSTRAINT chk_category_depth
CHECK (depth <= 3);

-- Create trigger function to maintain depth and prevent cycles
CREATE OR REPLACE FUNCTION update_category_depth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.depth := 0;
  ELSE
    SELECT depth + 1 INTO NEW.depth
    FROM categories WHERE id = NEW.parent_id;

    -- Check for circular reference by looking for target in ancestors
    IF EXISTS (
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id, 1 as depth
        FROM categories WHERE id = NEW.parent_id
        UNION ALL
        SELECT c.id, c.parent_id, a.depth + 1
        FROM categories c
        INNER JOIN ancestors a ON c.id = a.parent_id
        WHERE a.depth < 10
      )
      SELECT 1 FROM ancestors WHERE id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Circular reference detected in category hierarchy';
    END IF;

    IF NEW.depth > 3 THEN
      RAISE EXCEPTION 'Category hierarchy depth cannot exceed 3 levels';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_category_depth ON categories;
CREATE TRIGGER trg_category_depth
BEFORE INSERT OR UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_category_depth();

COMMENT ON COLUMN categories.depth IS
'Hierarchy depth for circular reference prevention. Max depth: 3 levels.';
