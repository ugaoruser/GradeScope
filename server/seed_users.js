import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'MySQLRoot123',
  database: process.env.DB_NAME || 'grade_tracker'
});

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