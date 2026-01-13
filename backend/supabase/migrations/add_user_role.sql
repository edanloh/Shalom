-- Add role column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'student';

-- Add check constraint for valid roles
ALTER TABLE users 
ADD CONSTRAINT valid_user_role 
CHECK (role IN ('student', 'instructor', 'admin'));

-- Update the instructor user to have admin role
UPDATE users 
SET role = 'admin' 
WHERE id = '550e8400-e29b-41d4-a716-446655440201';

-- Optionally update other specific users if needed
-- UPDATE users SET role = 'instructor' WHERE email = 'instructor@example.com';

-- Create index on role for better query performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Verify the changes
SELECT id, email, name, role FROM users WHERE role IN ('admin', 'instructor');
