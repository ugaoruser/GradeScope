// GradeTracker Database Setup and Seeder
// This script sets up the complete database schema and seeds initial data
// Run with: node generate_seed_sql.js

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'MySQLRoot123',
  database: process.env.DB_NAME || 'grade_tracker',
  multipleStatements: true
};

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔄 Connecting to MySQL...');
    connection = await mysql.createConnection(DB_CONFIG);
    
    console.log('🔄 Reading unified seed file...');
    const seedSQL = fs.readFileSync(path.join(process.cwd(), 'server/seed_unified.sql'), 'utf8');
    
    console.log('🔄 Executing database setup...');
    await connection.execute(seedSQL);
    
    console.log('✅ Database setup completed successfully!');
    console.log('\n📋 Test Users Created:');
    console.log('👨‍🎓 Students:');
    console.log('  - john.doe@school.edu (password: password123)');
    console.log('  - jane.smith@school.edu (password: password123)');
    console.log('👩‍🏫 Teachers:');
    console.log('  - mike.johnson@school.edu (password: password123)');
    console.log('  - sarah.wilson@school.edu (password: password123)');
    console.log('👨‍👩‍👧‍👦 Parent:');
    console.log('  - robert.brown@school.edu (password: password123)');
    console.log('\n🎯 Your GradeTracker is ready to use!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n🔧 Please check your database credentials in:');
      console.log('   - Environment variables (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)');
      console.log('   - Or update the defaults in this script');
    }
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

setupDatabase();
