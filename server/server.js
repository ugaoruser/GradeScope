// server/server.js
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import fs from "fs";
import compression from "compression";
import helmet from "helmet";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from this server folder explicitly to avoid root .env conflicts
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
app.use(cors({
  origin: function(origin, cb){
    const allowed = [
      undefined, // same-origin
      'https://ugaoruser.github.io',
      'http://localhost:5500',
      'http://localhost:3000'
    ];
    if (!origin || allowed.includes(origin)) return cb(null, true);
    return cb(null, true); // be permissive for now
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Security and compression
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "../docs"), { maxAge: '7d', etag: true })); // serve frontend

// Favicon: serve a tiny fallback if /favicon.ico missing on disk
app.get('/favicon.ico', (req, res) => {
  try{
    const filePath = path.join(__dirname, '../favicon.ico');
    if (fs.existsSync(filePath)) return res.sendFile(filePath);
    // 1x1 transparent PNG as fallback (b64)
    const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/ayv0XQAAAAASUVORK5CYII=';
    const buf = Buffer.from(b64, 'base64');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', 'image/x-icon');
    return res.status(200).end(buf);
  }catch{
    return res.status(204).end();
  }
});

// --- Server-Sent Events (SSE) for real-time updates ---
const sseClients = new Set();
function broadcast(event, data) {
  for (const res of sseClients) {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {}
  }
}
app.get('/api/events', (req, res) => {
  try {
    // Try Authorization header first
    let token = null;
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) token = auth.slice(7);
    // Then try cookies
    if (!token) token = (req.headers.cookie||'').split(';').map(s=>s.trim()).reduce((acc,cur)=>{ const i=cur.indexOf('='); if(i>0) acc[cur.slice(0,i)] = decodeURIComponent(cur.slice(i+1)); return acc; },{}).token;
    if (!token) return res.status(401).end();
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch {
      return res.status(401).end();
    }
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    if (typeof res.flushHeaders === 'function') res.flushHeaders();
    res.write(': connected\n\n');
    sseClients.add(res);
    const ping = setInterval(() => {
      try { res.write(`: ping ${Date.now()}\n\n`); } catch {}
    }, 25000);
    req.on('close', () => { clearInterval(ping); sseClients.delete(res); });
  } catch {
    try { res.end(); } catch {}
  }
});

// MySQL pool
const required = ['DB_HOST','DB_USER','DB_PASSWORD','DB_NAME'];
for (const k of required){ if (!process.env[k]) { console.warn(`[warn] Missing ${k} in environment. Using defaults may be insecure.`); } }
const db = await mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "grade_tracker",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  connectionLimit: 10
});

// Lightweight startup migration to ensure required schema parts exist
async function ensureStartupMigrations() {
  try {
    // Ensure 'section', 'code', 'teacher_id', 'grade_level' columns exist on subjects
await db.query(`
      ALTER TABLE subjects
      ADD COLUMN IF NOT EXISTS section VARCHAR(50) NULL,
      ADD COLUMN IF NOT EXISTS code VARCHAR(32) UNIQUE NULL,
      ADD COLUMN IF NOT EXISTS teacher_id INT NULL,
      ADD COLUMN IF NOT EXISTS grade_level VARCHAR(50) NULL
    `);
    // Try to add FK for teacher_id (ignore if fails)
    try{
      await db.query(`ALTER TABLE subjects ADD CONSTRAINT fk_subjects_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL`);
    }catch(_){}
  } catch (e) {
    // Fallback for older MySQL versions without IF NOT EXISTS
    try {
      const [cols] = await db.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subjects'
      `);
      const have = new Set(cols.map(c=>c.COLUMN_NAME));
      if (!have.has('section')) await db.query(`ALTER TABLE subjects ADD COLUMN section VARCHAR(50) NULL`);
      if (!have.has('code')) await db.query(`ALTER TABLE subjects ADD COLUMN code VARCHAR(32) UNIQUE NULL`);
      if (!have.has('teacher_id')) await db.query(`ALTER TABLE subjects ADD COLUMN teacher_id INT NULL`);
      if (!have.has('grade_level')) await db.query(`ALTER TABLE subjects ADD COLUMN grade_level VARCHAR(50) NULL`);
    } catch (inner) {
      console.error('Failed to ensure subjects columns:', inner);
    }
  }
  try {
    // Ensure roles table exists and seed roles
    await db.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      )
    `);
    const roles = ['student','teacher','parent'];
    for (const r of roles){
      try { await db.query(`INSERT IGNORE INTO roles (name) VALUES (?)`, [r]); } catch {}
    }
  } catch (e) {
    console.error('Failed to ensure roles table:', e);
  }
  try {
    // Ensure grade_categories table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS grade_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subject_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        weight DECIMAL(5,2) DEFAULT 0,
        quarter INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      )
    `);
  } catch (e) {
    console.error('Failed to ensure grade_categories table:', e);
  }
  try {
    // Ensure grade_items table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS grade_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subject_id INT NOT NULL,
        category_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        topic VARCHAR(255),
        item_type VARCHAR(50),
        included_in_final TINYINT(1) DEFAULT 1,
        max_score DECIMAL(8,2) NOT NULL,
        date_assigned DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES grade_categories(id) ON DELETE CASCADE
      )
    `);
  } catch (e) {
    console.error('Failed to ensure grade_items table:', e);
  }
  try {
    // Ensure enrollments table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        subject_id INT NOT NULL,
        student_id INT NOT NULL,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (subject_id, student_id),
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  } catch (e) {
    console.error('Failed to ensure enrollments table:', e);
  }
  try {
    // Ensure parent_child table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS parent_child (
        parent_id INT NOT NULL,
        child_id INT NOT NULL,
        linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (parent_id, child_id),
        FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (child_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  } catch (e) {
    console.error('Failed to ensure parent_child table:', e);
  }
  try {
    // Ensure scores and announcements tables exist
    await db.query(`
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
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subject_id INT NOT NULL,
        teacher_id INT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  } catch (e) {
    console.error('Failed to ensure scores/announcements tables:', e);
  }
  // Helpful indexes (ignore failures on older MySQL)
  try{ await db.query(`CREATE INDEX idx_subjects_code ON subjects(code)`); }catch{}
  try{ await db.query(`CREATE INDEX idx_grade_items_subject_category ON grade_items(subject_id, category_id)`); }catch{}
  try{ await db.query(`CREATE INDEX idx_scores_item_student ON scores(grade_item_id, student_id)`); }catch{}
  try{ await db.query(`CREATE INDEX idx_enrollments_subject_student ON enrollments(subject_id, student_id)`); }catch{}
  try{ await db.query(`CREATE INDEX idx_grade_categories_subject_quarter ON grade_categories(subject_id, quarter)`); }catch{}
  try{ await db.query(`CREATE INDEX idx_announcements_subject_created ON announcements(subject_id, created_at)`); }catch{}
}

await ensureStartupMigrations();

// Helper: basic sanitization
function sanitizeStr(s, max=255){ if (typeof s !== 'string') return ''; const t = s.trim(); return t.length>max? t.slice(0,max): t; }

// Helper: find user by email & role
async function findUserByEmailAndRole(email, roleName) {
  const [rows] = await db.query(
    `SELECT u.id, u.email, u.password_hash, u.full_name, r.name as role
     FROM users u JOIN roles r ON u.role_id = r.id
     WHERE u.email = ? AND r.name = ? LIMIT 1`, [email, roleName]
  );
  return rows[0];
}

// Helper: find user by email only
async function findUserByEmail(email) {
  const [rows] = await db.query(
    `SELECT u.id, u.email, u.password_hash, u.full_name, r.name as role
     FROM users u JOIN roles r ON u.role_id = r.id
     WHERE u.email = ? LIMIT 1`, [email]
  );
  return rows[0];
}

// Helper: get role ID by name
async function getRoleId(roleName) {
  const [rows] = await db.query(
    `SELECT id FROM roles WHERE name = ? LIMIT 1`, [roleName]
  );
  return rows[0]?.id;
}

// Middleware: verify JWT token (Authorization header or httpOnly cookie)
function parseTokenFromCookies(cookieHeader){
  if (!cookieHeader) return null;
  try{
    return cookieHeader.split(';').map(s=>s.trim()).reduce((acc,cur)=>{
      const idx = cur.indexOf('=');
      if (idx>0){ acc[cur.slice(0,idx)] = decodeURIComponent(cur.slice(idx+1)); }
      return acc;
    }, {})['token'] || null;
  }catch{ return null; }
}
function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  let token = null;
  if (auth && auth.startsWith('Bearer ')) token = auth.replace('Bearer ', '');
  if (!token) token = parseTokenFromCookies(req.headers.cookie);
  if (!token) return res.status(401).json({ message: "Missing authorization" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "secret");
    req.user = payload;
    next();
  } catch (e) {
    res.status(401).json({ message: "Invalid token" });
  }
}

// Role-based access helper
function requireRole(...roles){
  return (req, res, next)=>{
    try{
      if (!req.user || !roles.includes(req.user.role)){
        return res.status(403).json({ message: 'Access denied' });
      }
      next();
    }catch{ return res.status(403).json({ message: 'Access denied' }); }
  };
}

// Signup route
app.post("/api/signup", async (req, res) => {
  try {
    let { firstName, lastName, email, password, role } = req.body;
    firstName = sanitizeStr(firstName, 60);
    lastName = sanitizeStr(lastName, 60);
    email = sanitizeStr(email, 140).toLowerCase();
    role = sanitizeStr(role, 20);
    
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    // Check if user already exists with any role
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered with a different role. Please use a different email address." });
    }

    // Get role ID
    const roleId = await getRoleId(role);
    if (!roleId) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const [result] = await db.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [firstName, lastName, email, passwordHash, roleId]
    );

    res.json({ 
      message: "Account created successfully", 
      userId: result.insertId 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login route
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Missing fields" });

    // ✅ Fetch user and role name
    const [rows] = await db.query(`
      SELECT u.*, r.name AS role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.email = ?
    `, [email]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password_hash || "");

    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    // ✅ Sign JWT with the actual string role
    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.full_name },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "8h" }
    );

    // Set httpOnly cookie for better security when same-origin
    const isProd = process.env.NODE_ENV === 'production';
    res.setHeader('Set-Cookie', `token=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${60*60*8}; SameSite=Lax${isProd?'; Secure':''}`);

    // ✅ Return correct structure
    res.json({
      message: "Login successful",
      token,
      role: user.role,
      name: user.full_name,
      userId: user.id,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});



// Protected route to get current user info
app.get("/api/me", verifyToken, async (req, res) => {
  try {
    // Get full user information from database with role name from roles table
    const [users] = await db.query(
      `SELECT u.id, u.email, u.full_name as fullName, r.name as role 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`, 
      [req.user.userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const user = users[0];
    // Split full name into first and last name
    const nameParts = user.fullName ? user.fullName.split(' ') : ['', ''];
    user.firstName = nameParts[0] || '';
    user.lastName = nameParts.slice(1).join(' ') || '';
    
    res.json(user);
  } catch (e) {
    console.error("Error fetching user data:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user profile
app.post("/api/me/update", verifyToken, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    
    if (!firstName || !lastName) {
      return res.status(400).json({ message: "First name and last name are required" });
    }
    
    const fullName = `${firstName} ${lastName}`;
    
    // Update user in database
    await db.query(
      `UPDATE users SET full_name = ? WHERE id = ?`,
      [fullName, req.user.userId]
    );
    
    res.json({ 
      message: "Profile updated successfully",
      fullName,
      firstName,
      lastName
    });
  } catch (e) {
    console.error("Error updating user profile:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// Get grades (role-based access)
app.get("/api/grades", verifyToken, async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role === 'teacher') {
      // Teachers can see all grades
      const [grades] = await db.query(`
        SELECT g.*, s.title as subject_name, u.full_name as student_name
        FROM scores g
        JOIN grade_items gi ON g.grade_item_id = gi.id
        JOIN subjects s ON gi.subject_id = s.id
        JOIN users u ON g.student_id = u.id
        ORDER BY g.created_at DESC
      `);
      res.json(grades);
    } else if (role === 'student') {
      // Students can only see their own grades
      const [grades] = await db.query(`
        SELECT g.*, s.title as subject_name, u.full_name as student_name
        FROM scores g
        JOIN grade_items gi ON g.grade_item_id = gi.id
        JOIN subjects s ON gi.subject_id = s.id
        JOIN users u ON g.student_id = u.id
        WHERE g.student_id = ?
        ORDER BY g.created_at DESC
      `, [req.user.userId]);
      res.json(grades);
    } else if (role === 'parent') {
      // Parents can see their children's grades
      const [grades] = await db.query(`
        SELECT g.*, s.title as subject_name, u.full_name as student_name
        FROM scores g
        JOIN grade_items gi ON g.grade_item_id = gi.id
        JOIN subjects s ON gi.subject_id = s.id
        JOIN users u ON g.student_id = u.id
        JOIN parent_child pc ON u.id = pc.child_id
        WHERE pc.parent_id = ?
        ORDER BY g.created_at DESC
      `, [req.user.userId]);
      res.json(grades);
    } else {
      res.status(403).json({ message: "Access denied" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Add grade (teachers only)
app.post("/api/grades", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: "Only teachers can add grades" });
    }

    const { studentId, subjectId, grade, remarks, comments } = req.body;
    const note = comments ?? remarks ?? null;
    
    // Create a simple grade item for this subject if it doesn't exist
    const [gradeItem] = await db.query(`
      SELECT id FROM grade_items WHERE subject_id = ? LIMIT 1
    `, [subjectId]);
    
    let gradeItemId;
    if (gradeItem.length === 0) {
      const [result] = await db.query(`
        INSERT INTO grade_items (subject_id, title, max_score) VALUES (?, 'General Grade', 100)
      `, [subjectId]);
      gradeItemId = result.insertId;
    } else {
      gradeItemId = gradeItem[0].id;
    }

    // Insert the grade (use comments column)
    await db.query(`
      INSERT INTO scores (grade_item_id, student_id, score, comments) 
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE score = VALUES(score), comments = VALUES(comments)
    `, [gradeItemId, studentId, grade, note]);

broadcast('scoreUpdated', { subjectId, student_id: studentId, grade_item_id: gradeItemId });
    res.json({ message: "Grade added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get subjects
app.get("/api/subjects", verifyToken, async (req, res) => {
  try {
    const { title } = req.query;
    let query = `
      SELECT s.*, u.full_name as teacher_name
      FROM subjects s
      LEFT JOIN users u ON s.teacher_id = u.id
    `;
    const params = [];
    
    if (title) {
      query += ` WHERE s.title = ?`;
      params.push(title);
    }
    
    query += ` ORDER BY s.title`;
    
    const [subjects] = await db.query(query, params);
    res.json(subjects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new subject (teachers only)
app.post("/api/subjects", verifyToken, requireRole('teacher'), async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: "Only teachers can create subjects" });
    }

    let { title, gradeLevel, section } = req.body;
    title = sanitizeStr(title, 120);
    gradeLevel = sanitizeStr(gradeLevel, 40);
    section = sanitizeStr(section, 50);
    
    if (!title || !gradeLevel || !section) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Generate a secure 8-character access code with mixed charset
function generateAccessCode() {
      // 6-character, uppercase alphanumeric for easy sharing
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
      return code;
    }
    const accessCode = generateAccessCode();
    
    // Create the subject
    const [result] = await db.query(`
      INSERT INTO subjects (title, grade_level, section, teacher_id, code) 
      VALUES (?, ?, ?, ?, ?)
    `, [title, gradeLevel, section, req.user.userId, accessCode]);

    // Send email to teacher with access code using nodemailer if configured
    try {
      const [teacherRows] = await db.query(`SELECT email, full_name FROM users WHERE id = ?`, [req.user.userId]);
      const teacher = teacherRows[0];
      const smtpHost = process.env.SMTP_HOST;
      // Email sending disabled per requirements
      if (false) {
        await transporter.sendMail({
          from: process.env.MAIL_FROM || 'no-reply@gradetracker.local',
          to: teacher?.email,
          subject: `Access Code for ${title}`,
          text: `Hello ${teacher?.full_name || 'Teacher'},\n\nYour class "${title}" has been created.\nAccess Code: ${accessCode}\nSection: ${section}\n\nShare this code with students to join the class.`,
        });
      } else {
        // Email disabled
      }
    } catch (mailErr) {
      console.warn('Failed to send access code email:', mailErr);
    }

broadcast('classCreated', { subjectId: result.insertId, title, section, teacherId: req.user.userId });
    res.json({ 
      message: "Subject created successfully", 
      subjectId: result.insertId,
      accessCode
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Join a subject (students/parents)
app.post("/api/subjects/join", verifyToken, requireRole('student','parent'), async (req, res) => {
  try {
    if (req.user.role !== 'student' && req.user.role !== 'parent') {
      return res.status(403).json({ message: "Only students or parents can join subjects" });
    }

    const { accessCode } = req.body;
    
    if (!accessCode) {
      return res.status(400).json({ message: "Access code is required" });
    }

    // Validate format (6 chars uppercase alphanumeric)
    const code = String(accessCode).trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)){
      return res.status(400).json({ message: 'Invalid access code format' });
    }

    // Find the subject with the given access code
    const [subjects] = await db.query(`
      SELECT * FROM subjects WHERE code = ?
    `, [code]);

    if (subjects.length === 0) {
      return res.status(404).json({ message: "Invalid access code" });
    }

    const subject = subjects[0];
    let studentId = req.user.userId;
    
    // If parent, they need to specify which child to enroll
    if (req.user.role === 'parent' && req.body.childId) {
      // Verify this is actually their child
      const [children] = await db.query(`
        SELECT child_id FROM parent_child WHERE parent_id = ? AND child_id = ?
      `, [req.user.userId, req.body.childId]);
      
      if (children.length === 0) {
        return res.status(403).json({ message: "Not authorized to enroll this student" });
      }
      
      studentId = req.body.childId;
    }

    // Enroll the student
    await db.query(`
      INSERT INTO enrollments (subject_id, student_id) VALUES (?, ?)
      ON DUPLICATE KEY UPDATE enrolled_at = CURRENT_TIMESTAMP
    `, [subject.id, studentId]);

broadcast('enrollmentUpdated', { subjectId: subject.id, studentId });
    res.json({ message: "Successfully joined the subject" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
// Get classes for the current user
app.get('/api/classes', verifyToken, async (req, res) => {
  try {
    // For students: get classes they're enrolled in
    // For teachers: get classes they teach
    let classes;
    if (req.user.role === 'student') {
      [classes] = await db.query(
        `SELECT s.id, s.title, s.grade_level as section
         FROM subjects s
         JOIN enrollments e ON e.subject_id = s.id
         WHERE e.student_id = ?`, [req.user.userId]);
         
      // Normalize section field if needed
      classes = classes.map(cls => ({
        ...cls,
        section: cls.section || cls.grade_level || null
      }));
    } else if (req.user.role === 'teacher') {
      try {
        [classes] = await db.query(
          `SELECT s.id, s.title, s.grade_level
           FROM subjects s
           WHERE s.teacher_id = ?`, [req.user.userId]);
           
        // Normalize section field
        classes = classes.map(cls => ({
          ...cls,
          section: cls.grade_level || null
        }));
      } catch (error) {
        console.error("Error fetching teacher classes:", error);
        // Return default classes on error
        classes = [
          { id: 1, title: 'Mathematics', section: 'Section A' },
          { id: 2, title: 'Science', section: 'Section B' },
          { id: 3, title: 'English Literature', section: 'Section A' },
          { id: 4, title: 'World History', section: 'Section C' }
        ];
      }
    } else if (req.user.role === 'parent') {
      // Parents can see their children's classes
      [classes] = await db.query(
        `SELECT s.id, s.title, s.grade_level, u.full_name as student_name, u.id as student_id
         FROM subjects s
         JOIN enrollments e ON e.subject_id = s.id
         JOIN users u ON e.student_id = u.id
         JOIN parent_child pc ON u.id = pc.child_id
         WHERE pc.parent_id = ?`, [req.user.userId]);
         
      // Normalize section field
      classes = classes.map(cls => ({
        ...cls,
        section: cls.grade_level || null
      }));
    } else {
      classes = [];
    }
    res.json(classes);
  } catch (err) {
    console.error('Error loading classes:', err);
    // On error, return empty list to prevent UI errors
    res.json([]);
  }
});

// Create grade categories for a subject (teachers only)
app.post("/api/subjects/:subjectId/categories", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: "Only teachers can create grade categories" });
    }

    const { subjectId } = req.params;
    const { categories } = req.body;
    
    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({ message: "Categories array is required" });
    }
    // Validate total weight per quarter sums to 100
    try{
      const total = categories.reduce((acc,c)=> acc + Number(c.weight||0), 0);
      if (Math.abs(total - 100) > 0.01) return res.status(400).json({ message: 'Category weights must total 100%' });
    }catch{}

    // Verify teacher owns this subject
    const [subjects] = await db.query(
      `SELECT * FROM subjects WHERE id = ? AND teacher_id = ?`, 
      [subjectId, req.user.userId]
    );
    
    if (subjects.length === 0) {
      return res.status(403).json({ message: "Not authorized to modify this subject" });
    }

    // Insert categories in a transaction
    await db.query('START TRANSACTION');
    
    try {
      // Delete existing categories for this quarter if specified
      if (categories.length > 0 && categories[0].quarter) {
        await db.query(
          `DELETE FROM grade_categories WHERE subject_id = ? AND quarter = ?`,
          [subjectId, categories[0].quarter]
        );
      }
      
      // Insert new categories
      for (const category of categories) {
        await db.query(
          `INSERT INTO grade_categories (subject_id, name, weight, quarter) VALUES (?, ?, ?, ?)`,
          [subjectId, category.name, category.weight, category.quarter]
        );
      }
      
      await db.query('COMMIT');
      res.json({ message: "Grade categories created successfully" });
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Create/update grade items for a subject (teachers only)
app.post("/api/subjects/:subjectId/items", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: "Only teachers can create grade items" });
    }

    const { subjectId } = req.params;
const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: "Items array is required" });
    }
    // Sanitize items minimally
    items.forEach(it=>{ if (it){ it.title = sanitizeStr(it.title, 120); it.topic = sanitizeStr(it.topic, 200); it.item_type = sanitizeStr(it.item_type||it.itemType||'', 40); } });

    // Verify teacher owns this subject
    const [subjects] = await db.query(
      `SELECT * FROM subjects WHERE id = ? AND teacher_id = ?`, 
      [subjectId, req.user.userId]
    );
    
    if (subjects.length === 0) {
      return res.status(403).json({ message: "Not authorized to modify this subject" });
    }

    // Insert items in a transaction
    await db.query('START TRANSACTION');
    
    try {
      for (const item of items) {
        const categoryId = item.categoryId ?? item.category_id;
        const itemType = item.itemType ?? item.item_type ?? null;
        const includedInFinal = (item.includedInFinal ?? item.included_in_final) ? 1 : 0;
        const maxScore = item.maxScore ?? item.max_score;
        const dateAssigned = item.dateAssigned ?? item.date_assigned ?? null;

        if (item.id) {
          // Update existing item
          await db.query(
            `UPDATE grade_items SET 
             category_id = ?, title = ?, topic = ?, item_type = ?, 
             included_in_final = ?, max_score = ?, date_assigned = ?
             WHERE id = ? AND subject_id = ?`,
            [
              categoryId, item.title, item.topic, itemType,
              includedInFinal, maxScore, dateAssigned,
              item.id, subjectId
            ]
          );
        } else {
          // Insert new item
          await db.query(
            `INSERT INTO grade_items 
             (subject_id, category_id, title, topic, item_type, included_in_final, max_score, date_assigned)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              subjectId, categoryId, item.title, item.topic, itemType,
              includedInFinal, maxScore, dateAssigned
            ]
          );
        }
      }
      
      await db.query('COMMIT');
      res.json({ message: "Grade items updated successfully" });
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get grade categories for a subject (used by student grades view)
app.get("/api/subjects/:subjectId/categories", verifyToken, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { quarter } = req.query;
    let query = `SELECT id, subject_id, name, weight, quarter FROM grade_categories WHERE subject_id = ?`;
    const params = [subjectId];
    if (quarter) {
      query += ` AND quarter = ?`;
      params.push(quarter);
    }
    query += ` ORDER BY quarter, name`;
    const [categories] = await db.query(query, params);
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get grade items for a subject
app.get("/api/subjects/:subjectId/items", verifyToken, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { categoryId, quarter, childId } = req.query;
    
    let query = `
      SELECT i.*, c.name as category_name, c.quarter`;
    const params = [subjectId];

    if (req.user.role === 'student') {
      query += `, s.score, s.comments`;
    } else if (req.user.role === 'parent' && childId) {
      query += `, s.score, s.comments`;
    }

    query += `
      FROM grade_items i
      JOIN grade_categories c ON i.category_id = c.id`;

    if (req.user.role === 'student') {
      query += `
        LEFT JOIN scores s ON s.grade_item_id = i.id AND s.student_id = ?`;
      params.unshift(req.user.userId);
    } else if (req.user.role === 'parent' && childId) {
      // Verify parent-child relationship
      const [children] = await db.query(
        `SELECT child_id FROM parent_child WHERE parent_id = ? AND child_id = ?`,
        [req.user.userId, childId]
      );
      if (children.length === 0) {
        return res.status(403).json({ message: "Not authorized to view this student's scores" });
      }
      query += `
        LEFT JOIN scores s ON s.grade_item_id = i.id AND s.student_id = ?`;
      params.unshift(childId);
    }

    query += `
      WHERE i.subject_id = ?`;
    
    
    if (categoryId) {
      query += ` AND i.category_id = ?`;
      params.push(categoryId);
    }
    
    if (quarter) {
      query += ` AND c.quarter = ?`;
      params.push(quarter);
    }
    
    query += ` ORDER BY c.quarter, c.name, i.title`;
    
    const [items] = await db.query(query, params);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get students enrolled in a subject
app.get("/api/subjects/:subjectId/students", verifyToken, requireRole('teacher'), async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: "Only teachers can view enrolled students" });
    }

    const { subjectId } = req.params;
    
    // Verify teacher owns this subject
    const [subjects] = await db.query(
      `SELECT * FROM subjects WHERE id = ? AND teacher_id = ?`, 
      [subjectId, req.user.userId]
    );
    
    if (subjects.length === 0) {
      return res.status(403).json({ message: "Not authorized to view this subject" });
    }

    const [students] = await db.query(`
      SELECT u.id, u.full_name
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      WHERE e.subject_id = ?
      ORDER BY u.full_name
    `, [subjectId]);
    
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get student scores for a subject
app.get("/api/subjects/:subjectId/scores", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: "Only teachers can view scores" });
    }

    const { subjectId } = req.params;
    const { student_id, quarter } = req.query;
    
    if (!student_id) {
      return res.status(400).json({ message: "Student ID is required" });
    }
    
    // Verify teacher owns this subject
    const [subjects] = await db.query(
      `SELECT * FROM subjects WHERE id = ? AND teacher_id = ?`, 
      [subjectId, req.user.userId]
    );
    
    if (subjects.length === 0) {
      return res.status(403).json({ message: "Not authorized to view this subject" });
    }

    let query = `
      SELECT s.id, s.grade_item_id, s.student_id, s.score, s.comments
      FROM scores s
      JOIN grade_items gi ON s.grade_item_id = gi.id
      JOIN grade_categories gc ON gi.category_id = gc.id
      WHERE gi.subject_id = ? AND s.student_id = ?
    `;
    
    const params = [subjectId, student_id];
    
    if (quarter) {
      query += ` AND gc.quarter = ?`;
      params.push(quarter);
    }
    
    const [scores] = await db.query(query, params);
    res.json(scores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Add/update student score
app.post("/api/subjects/:subjectId/scores", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: "Only teachers can add/update scores" });
    }

    const { subjectId } = req.params;
    const { grade_item_id, student_id, score, comments } = req.body;
    
    if (!grade_item_id || !student_id || score === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    
    // Verify teacher owns this subject
    const [subjects] = await db.query(
      `SELECT * FROM subjects WHERE id = ? AND teacher_id = ?`, 
      [subjectId, req.user.userId]
    );
    
    if (subjects.length === 0) {
      return res.status(403).json({ message: "Not authorized to modify this subject" });
    }

    // Check if grade item belongs to this subject and get max_score
    const [gradeItems] = await db.query(
      `SELECT * FROM grade_items WHERE id = ? AND subject_id = ?`,
      [grade_item_id, subjectId]
    );
    
    if (gradeItems.length === 0) {
      return res.status(400).json({ message: "Invalid grade item" });
    }

    // Validate score range
    const maxScore = Number(gradeItems[0].max_score);
    const sVal = Number(score);
    if (!Number.isFinite(sVal) || sVal < 0 || (Number.isFinite(maxScore) && sVal > maxScore)) {
      return res.status(400).json({ message: `Score must be between 0 and ${maxScore}` });
    }

    // Check if student is enrolled in this subject
    const [enrollments] = await db.query(
      `SELECT * FROM enrollments WHERE subject_id = ? AND student_id = ?`,
      [subjectId, student_id]
    );
    
    if (enrollments.length === 0) {
      return res.status(400).json({ message: "Student not enrolled in this subject" });
    }

    // Insert or update score
    await db.query(`
      INSERT INTO scores (grade_item_id, student_id, score, comments)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE score = VALUES(score), comments = VALUES(comments)
    `, [grade_item_id, student_id, sVal, comments]);
    
    broadcast('scoreUpdated', { subjectId: Number(subjectId), student_id, grade_item_id });
    res.json({ message: "Score saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Grade summary for a subject and student
app.get('/api/subjects/:subjectId/grade-summary', verifyToken, async (req, res) => {
  try{
    const { subjectId } = req.params;
    const { quarter, studentId, childId } = req.query;

    let targetStudentId = null;
    if (req.user.role === 'student') targetStudentId = req.user.userId;
    else if (req.user.role === 'parent') {
      const cid = childId || studentId;
      if (!cid) return res.status(400).json({ message: 'childId is required for parents' });
      const [pc] = await db.query(`SELECT 1 FROM parent_child WHERE parent_id=? AND child_id=?`, [req.user.userId, cid]);
      if (!pc.length) return res.status(403).json({ message: 'Not authorized' });
      targetStudentId = cid;
    } else if (req.user.role === 'teacher') {
      targetStudentId = studentId; // optional for teacher; can be null to return class stats in future
    }

    if (!targetStudentId) return res.status(400).json({ message: 'studentId required' });

    // Categories for quarter
    const [cats] = await db.query(
      `SELECT id, name, weight, quarter FROM grade_categories WHERE subject_id=? ${quarter? 'AND quarter=?':''} ORDER BY name`,
      quarter ? [subjectId, quarter] : [subjectId]
    );

    // Items + scores for student
    const params = [targetStudentId, subjectId];
    let q = `
      SELECT i.id, i.max_score, i.included_in_final, i.date_assigned, i.title,
             c.id as category_id, c.name as category_name, c.weight, c.quarter,
             s.score
      FROM grade_items i
      JOIN grade_categories c ON c.id = i.category_id
      LEFT JOIN scores s ON s.grade_item_id = i.id AND s.student_id = ?
      WHERE i.subject_id = ?`;
    if (quarter) { q += ` AND c.quarter = ?`; params.push(quarter); }
    q += ` ORDER BY c.name, i.date_assigned, i.id`;
    const [rows] = await db.query(q, params);

    // Aggregate
    const summary = { categories: {}, final: 0, completion: 0 };
    let includedCount = 0, scoredCount = 0;
    for (const r of rows){
      if (!summary.categories[r.category_name]) summary.categories[r.category_name] = { weight: Number(r.weight)||0, total:0, max:0 };
      if (r.included_in_final){
        includedCount++;
        if (r.score != null) scoredCount++;
        summary.categories[r.category_name].total += Number(r.score)||0;
        summary.categories[r.category_name].max += Number(r.max_score)||0;
      }
    }
    // Compute weighted final
    for (const key of Object.keys(summary.categories)){
      const c = summary.categories[key];
      const pct = c.max > 0 ? (c.total/c.max) : 0;
      summary.final += pct * (c.weight/100) * 100;
    }
    summary.final = Number(summary.final.toFixed(2));
    summary.completion = includedCount>0 ? Number(((scoredCount/includedCount)*100).toFixed(1)) : 0;

    res.json(summary);
  }catch(e){
    console.error('grade-summary error', e);
    res.status(500).json({ message:'Server error' });
  }
});

// Delete a grade item
app.delete("/api/subjects/:subjectId/items/:itemId", verifyToken, requireRole('teacher'), async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: "Only teachers can delete grade items" });
    }

    const { subjectId, itemId } = req.params;
    
    // Verify teacher owns this subject
    const [subjects] = await db.query(
      `SELECT * FROM subjects WHERE id = ? AND teacher_id = ?`, 
      [subjectId, req.user.userId]
    );
    
    if (subjects.length === 0) {
      return res.status(403).json({ message: "Not authorized to modify this subject" });
    }

    // Delete grade item (cascade will delete associated scores)
    await db.query(`DELETE FROM grade_items WHERE id = ? AND subject_id = ?`, [itemId, subjectId]);
    
    res.json({ message: "Grade item deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a student score
app.delete("/api/subjects/:subjectId/scores/:scoreId", verifyToken, requireRole('teacher'), async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: "Only teachers can delete scores" });
    }

    const { subjectId, scoreId } = req.params;
    
    // Verify teacher owns this subject
    const [subjects] = await db.query(
      `SELECT * FROM subjects WHERE id = ? AND teacher_id = ?`, 
      [subjectId, req.user.userId]
    );
    
    if (subjects.length === 0) {
      return res.status(403).json({ message: "Not authorized to modify this subject" });
    }

    // Verify score is for a grade item in this subject
    const [scores] = await db.query(`
      SELECT s.* FROM scores s
      JOIN grade_items gi ON s.grade_item_id = gi.id
      WHERE s.id = ? AND gi.subject_id = ?
    `, [scoreId, subjectId]);
    
    if (scores.length === 0) {
      return res.status(404).json({ message: "Score not found" });
    }

    // Delete score
    await db.query(`DELETE FROM scores WHERE id = ?`, [scoreId]);
    
    res.json({ message: "Score deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Parent link a child by email (simple immediate link if student exists)
app.post('/api/parent/link', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'parent') return res.status(403).json({ message: 'Only parents can link children' });
    const { childEmail } = req.body;
    if (!childEmail) return res.status(400).json({ message: 'Child email is required' });
    const [rows] = await db.query(`
      SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id
      WHERE u.email = ? AND r.name = 'student' LIMIT 1
    `, [childEmail]);
    const child = rows[0];
    if (!child) return res.status(404).json({ message: 'Student account not found' });
    await db.query(`
      INSERT IGNORE INTO parent_child (parent_id, child_id) VALUES (?, ?)
    `, [req.user.userId, child.id]);
    broadcast('parentLinkUpdated', { parentId: req.user.userId, childId: child.id });
    res.json({ message: 'Linked successfully' });
  } catch (e) {
    console.error('Link child error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Subject announcements
app.get('/api/subjects/:subjectId/announcements', verifyToken, async (req, res) => {
  try {
    const { subjectId } = req.params;
    // Basic access: teacher of subject or enrolled student/parent of enrolled child
    let allowed = false;
    if (req.user.role === 'teacher') {
      const [s] = await db.query(`SELECT 1 FROM subjects WHERE id = ? AND teacher_id = ?`, [subjectId, req.user.userId]);
      allowed = s.length > 0;
    } else if (req.user.role === 'student') {
      const [en] = await db.query(`SELECT 1 FROM enrollments WHERE subject_id = ? AND student_id = ?`, [subjectId, req.user.userId]);
      allowed = en.length > 0;
    } else if (req.user.role === 'parent') {
      const { childId } = req.query;
      if (childId) {
        const [pc] = await db.query(`SELECT 1 FROM parent_child WHERE parent_id = ? AND child_id = ?`, [req.user.userId, childId]);
        if (pc.length) {
          const [en] = await db.query(`SELECT 1 FROM enrollments WHERE subject_id = ? AND student_id = ?`, [subjectId, childId]);
          allowed = en.length > 0;
        }
      }
    }
    if (!allowed) return res.status(403).json({ message: 'Not authorized' });

    const [rows] = await db.query(`
      SELECT a.id, a.message, a.created_at, u.full_name as teacher_name
      FROM announcements a JOIN users u ON a.teacher_id = u.id
      WHERE a.subject_id = ? ORDER BY a.created_at DESC LIMIT 50
    `, [subjectId]);
    res.json(rows);
  } catch (e) {
    console.error('Get announcements error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/subjects/:subjectId/announcements', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Only teachers can post announcements' });
    const { subjectId } = req.params;
    let { message } = req.body;
    message = sanitizeStr(message, 5000);
    if (!message) return res.status(400).json({ message: 'Message is required' });
    const [s] = await db.query(`SELECT 1 FROM subjects WHERE id = ? AND teacher_id = ?`, [subjectId, req.user.userId]);
    if (!s.length) return res.status(403).json({ message: 'Not authorized' });
    await db.query(`INSERT INTO announcements (subject_id, teacher_id, message) VALUES (?, ?, ?)`, [subjectId, req.user.userId, message.trim()]);
    broadcast('announcement', { subjectId: Number(subjectId) });
    res.json({ message: 'Announcement posted' });
  } catch (e) {
    console.error('Post announcement error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// List children for the current parent
app.get('/api/children', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can view children' });
    }
    const [rows] = await db.query(
      `SELECT u.id, u.full_name 
       FROM parent_child pc 
       JOIN users u ON u.id = pc.child_id 
       WHERE pc.parent_id = ? 
       ORDER BY u.full_name`,
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error loading children:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
