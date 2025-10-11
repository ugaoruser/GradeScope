-- Clean up test data for fresh testing
USE grade_tracker;

-- Clean up hover.japos user if it exists
DELETE FROM users WHERE email = 'hover.japos@test.com';

-- Remove ALL existing class enrollments and scores for John Doe and Jane Smith
DELETE FROM scores WHERE student_id IN (SELECT id FROM users WHERE email IN ('john.doe@school.edu', 'jane.smith@school.edu'));
DELETE FROM enrollments WHERE student_id IN (SELECT id FROM users WHERE email IN ('john.doe@school.edu', 'jane.smith@school.edu'));

-- Remove any existing Computer Science subject created by Mike Johnson
DELETE FROM subjects WHERE title = 'Computer Science' AND teacher_id = (SELECT id FROM users WHERE email = 'mike.johnson@school.edu');

-- Display test credentials
SELECT 'Test Users Available (Clean Slate):' as info;
SELECT 'Students:' as role, email, 'password: password123' as password FROM users WHERE email IN ('john.doe@school.edu', 'jane.smith@school.edu');
SELECT 'Teacher:' as role, email, 'password: password123' as password FROM users WHERE email = 'mike.johnson@school.edu';
SELECT 'Instructions:' as info;
SELECT '1. Login as mike.johnson@school.edu' as step;
SELECT '2. Create Computer Science class' as step;
SELECT '3. Get 8-character access code' as step;
SELECT '4. Login as john.doe@school.edu' as step;
SELECT '5. Use + button to join with access code' as step;
