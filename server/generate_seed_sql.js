import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

const users = [
  { firstName: 'John', lastName: 'Doe', email: 'john.doe@school.edu', password: 'password123', roleId: 1 },
  { firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@school.edu', password: 'password123', roleId: 1 },
  { firstName: 'Mike', lastName: 'Johnson', email: 'mike.johnson@school.edu', password: 'password123', roleId: 2 },
  { firstName: 'Sarah', lastName: 'Wilson', email: 'sarah.wilson@school.edu', password: 'password123', roleId: 2 },
  { firstName: 'Robert', lastName: 'Brown', email: 'robert.brown@school.edu', password: 'password123', roleId: 3 },
  { firstName: 'Admin', lastName: 'User', email: 'admin@school.edu', password: 'password123', roleId: 4 }
];

async function seed() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'MySQLRoot123',
    database: 'grade_tracker'
  });

  // Delete existing demo users by email
  await db.execute(
    `DELETE FROM users WHERE email IN (${users.map(u => `'${u.email}'`).join(",")})`
  );

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 12);
    await db.execute(
      `INSERT INTO users (first_name, last_name, email, password_hash, role_id)
       VALUES (?, ?, ?, ?, ?)`,
      [user.firstName, user.lastName, user.email, hash, user.roleId]
    );
  }

  console.log('Seeded users with hashed passwords!');
  await db.end();
}

seed();