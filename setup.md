# GradeTracker Setup Guide

## Overview
GradeTracker is a Google Classroom-like web application for managing grades and academic progress in a school environment. It supports multiple user roles with different access levels.

## Features
- **Authentication System**: Secure login/signup with email validation
- **Role-Based Access Control**: 
  - **Students**: View their own grades and assignments
  - **Teachers**: Add/edit grades, manage classes, add comments for low scores
  - **Parents**: Monitor their children's academic progress
  - **School Admin**: Manage subjects, users, and system-wide settings
- **Google Classroom-like UI**: Modern, responsive interface
- **Grade Management**: Teachers can add grades with comments for low scores
- **Subject Management**: Admins can manage subjects and enrollments

## Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Installation

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Database Setup
1. Create a MySQL database named `grade_tracker`
2. Run the schema file:
```bash
mysql -u your_username -p grade_tracker < schema.sql
```
3. Seed the database with sample data:
```bash
mysql -u your_username -p grade_tracker < seed_data.sql
```

### 3. Environment Configuration
Create a `.env` file in the `server` directory:
```env
PORT=3000
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=grade_tracker
DB_PORT=3306
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=https://localhost:3000
```

### 4. Start the Server
```bash
cd server
npm start
```

The application will be available at `https://localhost:3000`

## Usage

### Getting Started
1. **Sign Up**: Create an account with your email, password, and select your role
2. **Login**: Use your credentials to access the dashboard
3. **Role-Specific Features**: Each role has different capabilities

### User Roles

#### Student
- View personal grades and academic progress
- Access assignments and due dates
- Track performance across subjects

#### Teacher
- Add and edit student grades
- Add comments for low scores
- View class overview and statistics
- Manage grade entries

#### Parent
- Monitor child's academic progress
- View child's grades and performance
- Communicate with teachers

#### School Admin
- Manage subjects and teachers
- Manage user accounts and roles
- Generate system reports
- Oversee school-wide academic data

## Sample Accounts
The seed data includes sample accounts for testing:

- **Student**: john.doe@school.edu / password123
- **Teacher**: mike.johnson@school.edu / password123
- **Parent**: robert.brown@school.edu / password123
- **Admin**: admin@school.edu / password123

## API Endpoints

### Authentication
- `POST /api/signup` - Create new account
- `POST /api/login` - User login
- `GET /api/me` - Get current user info

### Grades
- `GET /api/grades` - Get grades (role-based access)
- `POST /api/grades` - Add grade (teachers only)

### Subjects
- `GET /api/subjects` - Get subjects

## Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Email format validation
- Role-based access control
- Secure session management

## Development
- Frontend: HTML, CSS, JavaScript (vanilla)
- Backend: Node.js, Express.js
- Database: MySQL
- Authentication: JWT tokens

## Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Troubleshooting

### Common Issues
1. **Database Connection**: Ensure MySQL is running and credentials are correct
2. **Port Conflicts**: Change PORT in .env if 3000 is occupied
3. **CORS Issues**: Update CORS_ORIGIN in .env for production

### Logs
Check server console for error messages and debugging information.

## Production Deployment
1. Use environment variables for all sensitive data
2. Use HTTPS in production
3. Set up proper database backups
4. Configure proper CORS origins
5. Use a strong JWT secret

## Support
For issues or questions, check the server logs and ensure all dependencies are properly installed.
