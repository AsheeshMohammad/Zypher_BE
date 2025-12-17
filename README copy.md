# ZYPHER Backend API

A minimal Express.js backend with JWT authentication and Swagger documentation.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Access Swagger UI at: http://localhost:3000/api-docs

## API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration  
- `GET /api/users/profile` - Get user profile (protected)
- `GET /api/users` - Get all users (protected)
- `GET /health` - Health check

## Test Credentials

- Email: admin@example.com
- Password: password