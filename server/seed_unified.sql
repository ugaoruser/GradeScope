-- GradeTracker - MASTER SEED FILE
-- Consolidated from multiple seed files for consistency
-- Password for all users: password123
-- Hash: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSy.8K2

USE grade_tracker;

-- Clean existing data for fresh start
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM scores;
DELETE FROM grade_items;
DELETE FROM grade_categories;
DELETE FROM enrollments;
DELETE FROM parent_child;
DELETE FROM subjects;
DELETE FROM users;
DELETE FROM roles;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert roles
INSERT INTO roles (id, name) VALUES 
(1, 'student'), 
(2, 'teacher'), 
(3, 'parent'), 
(4, 'admin');

-- Insert users (password: password123 for all)
INSERT INTO users (id, first_name, last_name, email, password_hash, role_id) VALUES 
(1, 'John', 'Doe', 'john.doe@school.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSy.8K2', 1),
(2, 'Jane', 'Smith', 'jane.smith@school.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSy.8K2', 1),
(3, 'Mike', 'Johnson', 'mike.johnson@school.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSy.8K2', 2),
(4, 'Sarah', 'Wilson', 'sarah.wilson@school.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSy.8K2', 2),
(5, 'Robert', 'Brown', 'robert.brown@school.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSy.8K2', 3),
(6, 'Admin', 'User', 'admin@school.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSy.8K2', 4);

-- Insert sample subjects
INSERT INTO subjects (id, code, title, grade_level, section, teacher_id) VALUES 
(1, 'MATH101', 'Mathematics', 'Grade 10', 'Section A', 3),
(2, 'SCI101', 'Science', 'Grade 10', 'Section B', 3),
(3, 'ENG101', 'English Literature', 'Grade 10', 'Section A', 4),
(4, 'HIST101', 'World History', 'Grade 10', 'Section C', 4);

-- Insert enrollments
INSERT INTO enrollments (subject_id, student_id) VALUES 
(1, 1), (1, 2), -- Math
(2, 1), (2, 2), -- Science  
(3, 1), (3, 2), -- English
(4, 1), (4, 2); -- History

-- Insert parent-child relationships
INSERT INTO parent_child (parent_id, child_id) VALUES 
(5, 1), -- Robert is parent of John
(5, 2); -- Robert is parent of Jane

-- Insert grade categories for each subject and quarter
-- Mathematics (Subject 1)
INSERT INTO grade_categories (id, subject_id, name, weight, quarter) VALUES
-- Quarter 1
(1, 1, 'Performance Task', 50, 1),
(2, 1, 'Written Works', 30, 1),
(3, 1, 'Periodical Exam', 20, 1),
-- Quarter 2
(4, 1, 'Performance Task', 50, 2),
(5, 1, 'Written Works', 30, 2),
(6, 1, 'Periodical Exam', 20, 2),
-- Quarter 3
(7, 1, 'Performance Task', 50, 3),
(8, 1, 'Written Works', 30, 3),
(9, 1, 'Periodical Exam', 20, 3),
-- Quarter 4
(10, 1, 'Performance Task', 50, 4),
(11, 1, 'Written Works', 30, 4),
(12, 1, 'Periodical Exam', 20, 4);

-- Science (Subject 2)
INSERT INTO grade_categories (id, subject_id, name, weight, quarter) VALUES
-- Quarter 1
(13, 2, 'Performance Task', 40, 1),
(14, 2, 'Written Works', 40, 1),
(15, 2, 'Periodical Exam', 20, 1),
-- Quarter 2
(16, 2, 'Performance Task', 40, 2),
(17, 2, 'Written Works', 40, 2),
(18, 2, 'Periodical Exam', 20, 2),
-- Quarter 3
(19, 2, 'Performance Task', 40, 3),
(20, 2, 'Written Works', 40, 3),
(21, 2, 'Periodical Exam', 20, 3),
-- Quarter 4
(22, 2, 'Performance Task', 40, 4),
(23, 2, 'Written Works', 40, 4),
(24, 2, 'Periodical Exam', 20, 4);

-- Insert sample grade items
INSERT INTO grade_items (id, subject_id, category_id, title, topic, item_type, included_in_final, max_score) VALUES 
-- Mathematics - Quarter 1
(1, 1, 1, 'Problem Solving Task', 'Algebra', 'Performance Task', TRUE, 100),
(2, 1, 1, 'Math Project', 'Geometry', 'Performance Task', TRUE, 100),
(3, 1, 2, 'Quiz 1', 'Algebra Basics', 'Quiz', TRUE, 50),
(4, 1, 2, 'Quiz 2', 'Linear Equations', 'Quiz', TRUE, 50),
(5, 1, 3, 'Quarter 1 Exam', 'All Q1 Topics', 'Exam', TRUE, 100),
-- Mathematics - Quarter 2
(6, 1, 4, 'Group Activity', 'Trigonometry', 'Performance Task', TRUE, 100),
(7, 1, 5, 'Homework Set', 'Quadratic Equations', 'Written Work', TRUE, 50),
(8, 1, 6, 'Quarter 2 Exam', 'All Q2 Topics', 'Exam', TRUE, 100),
-- Science - Quarter 1
(9, 2, 13, 'Lab Experiment', 'Chemical Reactions', 'Performance Task', TRUE, 100),
(10, 2, 13, 'Science Fair Project', 'Biology', 'Performance Task', TRUE, 100),
(11, 2, 14, 'Research Paper', 'Ecosystems', 'Written Work', TRUE, 100),
(12, 2, 15, 'Quarter 1 Exam', 'All Q1 Topics', 'Exam', TRUE, 100),
-- Science - Quarter 2
(15, 2, 16, 'Lab Report', 'Physics', 'Performance Task', TRUE, 100),
(16, 2, 17, 'Research Assignment', 'Earth Science', 'Written Work', TRUE, 100),
(17, 2, 18, 'Quarter 2 Exam', 'All Q2 Topics', 'Exam', TRUE, 100),
-- Assessment items (not included in final grade)
(13, 1, 1, 'Practice Problems', 'Algebra', 'Assessment', FALSE, 50),
(14, 2, 13, 'Pre-lab Quiz', 'Lab Safety', 'Assessment', FALSE, 20);

-- Insert sample scores
INSERT INTO scores (grade_item_id, student_id, score, comments) VALUES 
-- Mathematics - Quarter 1 - John Doe
(1, 1, 85, 'Good work, keep it up!'),
(2, 1, 92, 'Excellent project presentation'),
(3, 1, 45, 'Study more on algebraic expressions'),
(4, 1, 48, 'Good improvement on equations'),
(5, 1, 78, 'Study more for the next exam'),
-- Mathematics - Quarter 1 - Jane Smith
(1, 2, 90, 'Outstanding work'),
(2, 2, 95, 'Excellent project and presentation'),
(3, 2, 48, 'Good understanding of concepts'),
(4, 2, 47, 'Continue practicing equations'),
(5, 2, 92, 'Excellent understanding of concepts'),
-- Mathematics - Quarter 2 - John Doe
(6, 1, 88, 'Great teamwork'),
(7, 1, 42, 'Complete all problems next time'),
(8, 1, 85, 'Good exam performance'),
-- Mathematics - Quarter 2 - Jane Smith
(6, 2, 94, 'Outstanding group contribution'),
(7, 2, 48, 'All problems solved correctly'),
(8, 2, 96, 'Excellent exam performance'),
-- Science - Quarter 1 - John Doe
(9, 1, 82, 'Good lab work, improve documentation'),
(10, 1, 90, 'Excellent project presentation'),
(11, 1, 85, 'Well-researched paper'),
(12, 1, 79, 'Review biological concepts'),
-- Science - Quarter 1 - Jane Smith
(9, 2, 88, 'Very thorough lab documentation'),
(10, 2, 95, 'Outstanding project and presentation'),
(11, 2, 92, 'Excellent research and writing'),
(12, 2, 94, 'Outstanding exam performance'),
-- Science - Quarter 2 - John Doe
(15, 1, 84, 'Good lab report'),
(16, 1, 88, 'Well-researched assignment'),
(17, 1, 82, 'Good exam performance'),
-- Science - Quarter 2 - Jane Smith
(15, 2, 92, 'Excellent lab report'),
(16, 2, 94, 'Outstanding research'),
(17, 2, 90, 'Excellent exam performance');

-- Display test credentials
SELECT 'Test Users Available:' as info;
SELECT 'Students:' as role, email, 'password: password123' as password FROM users WHERE role_id = 1;
SELECT 'Teachers:' as role, email, 'password: password123' as password FROM users WHERE role_id = 2;
SELECT 'Parent:' as role, email, 'password: password123' as password FROM users WHERE role_id = 3;