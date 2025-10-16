import pool from './db.js';
import bcrypt from 'bcryptjs';

const users = [
  { first_name: 'John', last_name: 'Doe', email: 'john.doe@school.edu', role_id: 1 },
  { first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@school.edu', role_id: 1 },
  { first_name: 'Mike', last_name: 'Johnson', email: 'mike.johnson@school.edu', role_id: 2 },
  { first_name: 'Sarah', last_name: 'Wilson', email: 'sarah.wilson@school.edu', role_id: 2 },
  { first_name: 'Robert', last_name: 'Brown', email: 'robert.brown@school.edu', role_id: 3 }
];

async function seed() {
  try {
    // Use the same bcrypt hash (password123) for all demo users (matches John Doe)
    const commonHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSy.8K2';
    for (let u of users) {
      await pool.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, role_id)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE email = email`,
        [u.first_name, u.last_name, u.email, commonHash, u.role_id]
      );
    }

    console.log("✅ Users seeded successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding users:", err);
    process.exit(1);
  }
}

seed();