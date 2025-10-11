-- Seed data for GradeTracker
USE grade_tracker;

-- Insert roles
INSERT IGNORE INTO roles (id, name) VALUES 
(1, 'student'), 
(2, 'teacher'), 
(3, 'parent'), 
(4, 'admin');

-- Insert sample users with password 'password123' for all users
INSERT IGNORE INTO users (id, first_name, last_name, email, password_hash, role_id) VALUES 
(1, 'John', 'Doe', 'john.doe@school.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSy.8K2', 1), -- student
(2, 'Jane', 'Smith', 'jane.smith@school.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSy.8K2', 1), -- student
(3, 'Mike', 'Johnson', 'mike.johnson@school.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSy.8K2', 2), -- teacher
(4, 'Sarah', 'Wilson', 'sarah.wilson@school.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSy.8K2', 2), -- teacher
(5, 'Robert', 'Brown', 'robert.brown@school.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSy.8K2', 3); -- parent

-- Insert sample subjects with sections
INSERT IGNORE INTO subjects (id, code, title, grade_level, section, teacher_id) VALUES 
(1, 'MATH101', 'Mathematics', 'Grade 10', 'Section A', 3),
(2, 'SCI101', 'Science', 'Grade 10', 'Section B', 3),
(3, 'ENG101', 'English Literature', 'Grade 10', 'Section A', 4),
(4, 'HIST101', 'World History', 'Grade 10', 'Section C', 4);

-- Insert sample enrollments
INSERT IGNORE INTO enrollments (subject_id, student_id) VALUES 
(1, 1), (1, 2), -- Math
(2, 1), (2, 2), -- Science
(3, 1), (3, 2), -- English
(4, 1), (4, 2); -- History

-- Insert parent-child relationships
INSERT IGNORE INTO parent_child (parent_id, child_id) VALUES 
(5, 1), -- Robert Brown is parent of John Doe
(5, 2); -- Robert Brown is parent of Jane Doe

-- Insert grade categories for each subject and quarter
-- Mathematics (Subject 1)
INSERT IGNORE INTO grade_categories (id, subject_id, name, weight, quarter) VALUES
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
INSERT IGNORE INTO grade_categories (id, subject_id, name, weight, quarter) VALUES
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

-- English (Subject 3)
INSERT IGNORE INTO grade_categories (id, subject_id, name, weight, quarter) VALUES
-- Quarter 1
(25, 3, 'Performance Task', 40, 1),
(26, 3, 'Written Works', 40, 1),
(27, 3, 'Periodical Exam', 20, 1),
-- Quarter 2
(28, 3, 'Performance Task', 40, 2),
(29, 3, 'Written Works', 40, 2),
(30, 3, 'Periodical Exam', 20, 2),
-- Quarter 3
(31, 3, 'Performance Task', 40, 3),
(32, 3, 'Written Works', 40, 3),
(33, 3, 'Periodical Exam', 20, 3),
-- Quarter 4
(34, 3, 'Performance Task', 40, 4),
(35, 3, 'Written Works', 40, 4),
(36, 3, 'Periodical Exam', 20, 4);

-- History (Subject 4)
INSERT IGNORE INTO grade_categories (id, subject_id, name, weight, quarter) VALUES
-- Quarter 1
(37, 4, 'Performance Task', 40, 1),
(38, 4, 'Written Works', 40, 1),
(39, 4, 'Periodical Exam', 20, 1),
-- Quarter 2
(40, 4, 'Performance Task', 40, 2),
(41, 4, 'Written Works', 40, 2),
(42, 4, 'Periodical Exam', 20, 2),
-- Quarter 3
(43, 4, 'Performance Task', 40, 3),
(44, 4, 'Written Works', 40, 3),
(45, 4, 'Periodical Exam', 20, 3),
-- Quarter 4
(46, 4, 'Performance Task', 40, 4),
(47, 4, 'Written Works', 40, 4),
(48, 4, 'Periodical Exam', 20, 4);

-- Insert sample grade items
INSERT IGNORE INTO grade_items (id, subject_id, category_id, title, topic, item_type, included_in_final, max_score) VALUES 
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
-- English - Quarter 1
(18, 3, 25, 'Book Report', 'Literature', 'Performance Task', TRUE, 100),
(19, 3, 25, 'Oral Presentation', 'Public Speaking', 'Performance Task', TRUE, 100),
(20, 3, 26, 'Essay 1', 'Creative Writing', 'Written Work', TRUE, 100),
(21, 3, 27, 'Quarter 1 Exam', 'All Q1 Topics', 'Exam', TRUE, 100),
-- English - Quarter 2
(22, 3, 28, 'Group Presentation', 'Poetry', 'Performance Task', TRUE, 100),
(23, 3, 29, 'Research Paper', 'Literary Analysis', 'Written Work', TRUE, 100),
(24, 3, 30, 'Quarter 2 Exam', 'All Q2 Topics', 'Exam', TRUE, 100),
-- History - Quarter 1
(25, 4, 37, 'Historical Reenactment', 'Ancient Civilizations', 'Performance Task', TRUE, 100),
(26, 4, 38, 'Timeline Project', 'World Events', 'Written Work', TRUE, 100),
(27, 4, 39, 'Quarter 1 Exam', 'All Q1 Topics', 'Exam', TRUE, 100),
-- History - Quarter 2
(28, 4, 40, 'Museum Exhibit Project', 'Medieval History', 'Performance Task', TRUE, 100),
(29, 4, 41, 'Research Essay', 'Renaissance Period', 'Written Work', TRUE, 100),
(30, 4, 42, 'Quarter 2 Exam', 'All Q2 Topics', 'Exam', TRUE, 100),
-- Assessment items (not included in final grade)
(13, 1, 1, 'Practice Problems', 'Algebra', 'Assessment', FALSE, 50),
(14, 2, 13, 'Pre-lab Quiz', 'Lab Safety', 'Assessment', FALSE, 20);

-- Insert sample scores
INSERT IGNORE INTO scores (grade_item_id, student_id, score, comments) VALUES 
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
(17, 2, 90, 'Excellent exam performance'),
-- English - Quarter 1 - John Doe
(18, 1, 85, 'Good analysis of the book'),
(19, 1, 80, 'Work on presentation skills'),
(20, 1, 88, 'Well-written essay'),
(21, 1, 82, 'Good understanding of concepts'),
-- English - Quarter 1 - Jane Smith
(18, 2, 92, 'Excellent book analysis'),
(19, 2, 95, 'Outstanding presentation skills'),
(20, 2, 90, 'Well-structured essay'),
(21, 2, 94, 'Excellent understanding of concepts'),
-- English - Quarter 2 - John Doe
(22, 1, 86, 'Good group contribution'),
(23, 1, 84, 'Well-researched paper'),
(24, 1, 80, 'Good exam performance'),
-- English - Quarter 2 - Jane Smith
(22, 2, 93, 'Outstanding group leadership'),
(23, 2, 96, 'Excellent research and analysis'),
(24, 2, 92, 'Excellent exam performance'),
-- History - Quarter 1 - John Doe
(25, 1, 88, 'Creative reenactment'),
(26, 1, 85, 'Comprehensive timeline'),
(27, 1, 82, 'Good understanding of historical events'),
-- History - Quarter 1 - Jane Smith
(25, 2, 94, 'Outstanding historical accuracy'),
(26, 2, 92, 'Detailed and well-researched timeline'),
(27, 2, 90, 'Excellent understanding of historical context'),
-- History - Quarter 2 - John Doe
(28, 1, 87, 'Creative museum exhibit'),
(29, 1, 84, 'Well-researched essay'),
(30, 1, 80, 'Good exam performance'),
-- History - Quarter 2 - Jane Smith
(28, 2, 95, 'Outstanding exhibit design'),
(29, 2, 93, 'Excellent research and analysis'),
(30, 2, 91, 'Excellent exam performance'),
-- Assessment items (not included in final grade)
(13, 1, 40, 'Keep practicing'),
(13, 2, 45, 'Good progress'),
(14, 1, 18, 'Review lab safety procedures'),
(14, 2, 20, 'Perfect understanding of lab safety');