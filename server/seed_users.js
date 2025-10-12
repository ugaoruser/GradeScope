import pool from './db.js';
import bcrypt from 'bcryptjs';

const users = [
  { email: 'student1@example.com', password: 'password123', full_name: 'Student One', role_id: 1 },
  { email: 'teacher1@example.com', password: 'password123', full_name: 'Teacher One', role_id: 2 },
  { email: 'parent1@example.com',  password: 'password123', full_name: 'Parent One',  role_id: 3 },
  { email: 'admin1@example.com',   password: 'password123', full_name: 'Admin One',   role_id: 4 }
];

async function seed() {
  try {
    for (let u of users) {
      const hashed = await bcrypt.hash(u.password, 10);

      await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role_id)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE email = email`,
        [u.email, hashed, u.full_name, u.role_id]
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