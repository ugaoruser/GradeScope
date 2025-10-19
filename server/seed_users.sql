USE grade_tracker;

-- Seed users with proper first/last names and bcrypt-hashed passwords (password123)
INSERT INTO users (first_name, last_name, email, password_hash, role_id)
VALUES
('John', 'Doe', 'john.doe@school.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSy.8K2', 1), -- student
('Jane', 'Smith', 'jane.smith@school.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSy.8K2', 1), -- student
('Mike', 'Johnson', 'mike.johnson@school.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSy.8K2', 2), -- teacher
('Sarah', 'Wilson', 'sarah.wilson@school.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSy.8K2', 2), -- teacher
('Robert', 'Brown', 'robert.brown@school.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSy.8K2', 3); -- parent