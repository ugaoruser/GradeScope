-- =========================================================
--  Grade Tracker Database Schema (Clean Version, No Admin)
-- =========================================================

CREATE DATABASE IF NOT EXISTS grade_tracker 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;
USE grade_tracker;

-- =========================================================
--  ROLES TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

-- =========================================================
--  USERS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) 
    GENERATED ALWAYS AS (CONCAT(first_name, ' ', last_name)) STORED,
  role_id INT NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

-- =========================================================
--  SUBJECTS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(32) UNIQUE,          -- Join code
  title VARCHAR(255) NOT NULL,
  grade_level VARCHAR(50),
  section VARCHAR(50),
  teacher_id INT,                   -- References users (teacher)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =========================================================
--  ENROLLMENTS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  student_id INT NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (subject_id, student_id)
);

-- =========================================================
--  GRADE CATEGORIES TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS grade_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,       -- e.g. 'Performance Task', 'Written Works'
  weight DECIMAL(5,2) DEFAULT 0,    -- Percentage weight in final grade
  quarter INT NOT NULL,             -- 1, 2, 3, or 4
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- =========================================================
--  GRADE ITEMS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS grade_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  category_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  topic VARCHAR(255),
  item_type VARCHAR(100),           -- e.g. 'Assessment', 'Quiz', etc.
  included_in_final BOOLEAN DEFAULT TRUE,
  max_score DECIMAL(8,2) DEFAULT 100,
  date_assigned DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES grade_categories(id) ON DELETE CASCADE
);

-- =========================================================
--  SCORES TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grade_item_id INT NOT NULL,
  student_id INT NOT NULL,
  score DECIMAL(8,2) NOT NULL,
  comments VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (grade_item_id) REFERENCES grade_items(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (grade_item_id, student_id)
);

-- =========================================================
--  PARENT-CHILD RELATIONSHIP TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS parent_child (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT NOT NULL,
  child_id INT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(parent_id, child_id)
);

-- =========================================================
--  INITIAL ROLE SEED (NO ADMIN)
-- =========================================================
INSERT IGNORE INTO roles (id, name) VALUES
  (1, 'student'),
  (2, 'teacher'),
  (3, 'parent');
