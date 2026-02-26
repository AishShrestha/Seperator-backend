# Seperator Backend — Project Report

**Generated:** February 26, 2025  
**Project:** Seperator API (Expense Sharing Application)  
**Framework:** NestJS 11.x  
**Database:** PostgreSQL  
**Cache:** Redis  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Architecture](#2-project-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Directory Structure](#4-directory-structure)
5. [Modules & Features](#5-modules--features)
6. [Database Schema](#6-database-schema)
7. [API Endpoints](#7-api-endpoints)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Configuration & Environment](#9-configuration--environment)
10. [Security Features](#10-security-features)
11. [Infrastructure & DevOps](#11-infrastructure--devops)
12. [Code Quality & Standards](#12-code-quality--standards)
13. [Recommendations](#13-recommendations)

---

## 1. Executive Summary

**Seperator** is a NestJS-based backend API for an expense-sharing application. It enables users to:

- Register, log in, and manage accounts (including password reset)
- Create and join groups for shared expenses
- Add expenses with flexible split types (equal, percentage, exact amounts)
- Record settlements between group members
- Receive notifications

The backend uses **PostgreSQL** for persistence, **Redis** for caching, **JWT** for authentication (stored in HttpOnly cookies), and **Swagger** for API documentation.

---

## 2. Project Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Frontend)                         │
│                    http://localhost:3000                         │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP / REST
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NestJS Application                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Middleware  │  │   Guards    │  │ Exception Filters      │  │
│  │ (Async     │  │ (JWT,       │  │ (HTTP, Validation,      │  │
│  │  Storage)   │  │  GroupRoles)│  │  NotFound, Custom)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Feature Modules                           ││
│  │  User │ Group │ Expense │ Settlement │ Notification │ Health ││
│  └─────────────────────────────────────────────────────────────┘│
└───────────────┬─────────────────────────────┬────────────────────┘
                │                             │
                ▼                             ▼
        ┌───────────────┐             ┌───────────────┐
        │  PostgreSQL   │             │     Redis     │
        │   (TypeORM)   │             │    (Cache)    │
        └───────────────┘             └───────────────┘
```

### Design Patterns

- **Modular architecture** — Feature-based modules (User, Group, Expense, etc.)
- **Dependency injection** — NestJS DI container
- **Repository pattern** — TypeORM entities and repositories
- **Guard-based authorization** — JwtAuthGuard, GroupRolesGuard
- **DTO validation** — class-validator with ValidationPipe

---

## 3. Technology Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | ^11.0.11 | Backend framework |
| TypeScript | ^5.7.3 | Language |
| Node.js | — | Runtime |

### Database & ORM

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeORM | ^0.3.20 | ORM |
| PostgreSQL (pg) | ^8.11.5 | Database driver |
| @nestjs/typeorm | ^11.0.0 | NestJS TypeORM integration |

### Authentication & Security

| Technology | Version | Purpose |
|------------|---------|---------|
| @nestjs/jwt | ^11.0.0 | JWT handling |
| @nestjs/passport | ^11.0.5 | Passport integration |
| passport-jwt | ^4.0.1 | JWT strategy |
| bcryptjs | ^2.4.3 | Password hashing |
| helmet | ^7.1.0 | Security headers |
| cookie-parser | ^1.4.7 | Cookie parsing |

### Caching & Performance

| Technology | Version | Purpose |
|------------|---------|---------|
| @nestjs/cache-manager | ^3.0.0 | Cache abstraction |
| @keyv/redis | ^4.3.0 | Redis store |
| cache-manager | ^6.4.0 | Cache manager |

### Validation & Documentation

| Technology | Version | Purpose |
|------------|---------|---------|
| class-validator | ^0.14.1 | DTO validation |
| class-transformer | ^0.5.1 | Object transformation |
| @nestjs/swagger | ^11.0.6 | API documentation |
| swagger-ui-express | ^5.0.0 | Swagger UI |

### Logging & Monitoring

| Technology | Version | Purpose |
|------------|---------|---------|
| pino | ^8.19.0 | Fast JSON logger |
| pino-pretty | ^10.3.1 | Pretty logging (dev) |
| @nestjs/terminus | ^11.0.0 | Health checks |

### Other

| Technology | Version | Purpose |
|------------|---------|---------|
| nodemailer | ^6.9.7 | Email (password reset) |
| nanoid | ^5.1.6 | ID generation |
| socket.io | ^4.8.1 | WebSocket (available, not actively used) |

---

## 4. Directory Structure

```
seperator-backend/
├── src/
│   ├── app.module.ts              # Root application module
│   ├── main.ts                    # Application entry point
│   │
│   ├── app-cache/                 # Redis cache module
│   ├── common/                    # Shared utilities
│   │   ├── decorator/             # @Auth() decorator
│   │   ├── dto/                   # ErrorResponseDto, PaginationQueryDto
│   │   ├── exceptions/            # Custom exceptions
│   │   └── filters/               # Exception filters (4 filters)
│   │
│   ├── db/                        # Database configuration
│   │   ├── db.module.ts
│   │   └── migrations/            # TypeORM migrations (13 files)
│   │
│   ├── expense/                   # Expense management
│   │   ├── dto/
│   │   ├── entity/
│   │   ├── enums/                 # SplitType
│   │   └── interfaces/
│   │
│   ├── global/                    # Global services
│   │   ├── middleware/            # AsyncStorageMiddleware
│   │   └── services/              # MailService, AsyncLocalStorage
│   │
│   ├── group/                     # Group management
│   │   ├── decorators/            # @GroupRoles()
│   │   ├── dto/
│   │   ├── entity/
│   │   ├── enums/                 # GroupRole
│   │   └── guards/                # GroupRolesGuard
│   │
│   ├── health/                    # Health check endpoints
│   ├── logger/                    # Pino logger module
│   ├── notification/              # Notification module
│   ├── settlement/                # Settlement module
│   ├── services/                  # App configuration
│   │   └── app-config/
│   └── user/                      # User & authentication
│       ├── dto/
│       ├── entity/
│       ├── guards/                # JwtAuthGuard
│       └── services/
│           ├── auth/              # AuthService, JWT Strategy
│           ├── jwt/
│           ├── password/
│           └── user/
│
├── test/                          # Unit & E2E tests
├── type-orm.config.ts             # TypeORM CLI config
├── tsconfig.json
├── nest-cli.json
├── package.json
└── Dockerfile
```

---

## 5. Modules & Features

### 5.1 User Module

**Purpose:** User registration, authentication, and profile management.

**Components:**
- **UserController** — Auth and user endpoints
- **AuthService** — Register, login, logout, refresh, password reset
- **UserService** — User CRUD operations
- **PasswordService** — Hashing, reset token generation
- **JwtService** — Token signing/verification
- **JwtStrategy** — Passport JWT strategy (cookie-based)
- **JwtAuthGuard** — Protects authenticated routes

**Features:**
- Registration with email/password
- Login with HttpOnly cookie-based tokens
- Refresh token rotation (7-day expiry)
- Logout (token invalidation)
- Forgot password / Reset password flow
- Get current user (`/me`)
- List all users (cached)

---

### 5.2 Group Module

**Purpose:** Expense groups and membership management.

**Components:**
- **GroupController** — Group CRUD, membership, invite codes
- **GroupService** — Business logic
- **GroupRolesGuard** — Role-based access (OWNER, ADMIN, MEMBER)
- **@GroupRoles()** decorator

**Features:**
- Create group
- Get user's groups
- Join group via invite code
- Get group details and balance
- Update group (OWNER/ADMIN)
- Leave group
- Update member role (OWNER)
- Remove member (OWNER/ADMIN)

---

### 5.3 Expense Module

**Purpose:** Expense creation, splitting, and tracking.

**Components:**
- **ExpenseController** — Expense CRUD
- **ExpenseService** — Expense logic
- **Entities:** Expense, ExpenseShare, ExpensePayment, ExpenseCategory

**Features:**
- Create expense with split types (equal, percentage, exact)
- Update expense
- Get expenses by group (paginated)
- Delete expense

---

### 5.4 Settlement Module

**Purpose:** Record settlements between group members.

**Components:**
- **SettlementController**
- **SettlementService**
- **Settlement** entity

**Features:**
- Get settlements by group
- Create settlement

---

### 5.5 Notification Module

**Purpose:** User notifications.

**Components:**
- **NotificationController**
- **NotificationService**
- **Notification** entity

**Features:**
- Get user notifications
- Mark notification as read

---

### 5.6 Health Module

**Purpose:** Service health checks.

**Features:**
- Database connectivity check
- Redis cache health check

---

### 5.7 Supporting Modules

| Module | Purpose |
|--------|---------|
| **GlobalModule** | AsyncLocalStorage, MailService |
| **LoggerModule** | Pino-based logging |
| **AppCacheModule** | Redis cache configuration |
| **DbModule** | TypeORM + PostgreSQL |
| **ConfigModule** | Environment configuration |

---

## 6. Database Schema

### Entities Overview

| Entity | Table | Description |
|--------|-------|-------------|
| **User** | `users` | User accounts, auth fields |
| **Group** | `groups` | Expense groups |
| **GroupMember** | `group_members` | Group membership with roles |
| **Expense** | `expenses` | Expenses with split type |
| **ExpenseShare** | `expense_shares` | User shares in expenses |
| **ExpensePayment** | `expense_payments` | Payments for expenses |
| **ExpenseCategory** | `expense_categories` | Expense categories |
| **Settlement** | `settlements` | Settlements between users |
| **Notification** | `notifications` | User notifications |

### User Entity Fields

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | string | |
| email | string | |
| password | string | Hashed, select: false |
| avatar | string | Nullable |
| refresh_token | string | Nullable, select: false |
| refresh_token_expires_at | timestamp | Nullable |
| password_reset_token | string | Nullable, select: false |
| password_reset_token_expires_at | timestamp | Nullable |

### Migrations (13 total)

1. `1758770545482-init` — Initial users table
2. `1758848250077-added-refreshToken` — Refresh token support
3. `1761129181992-added-groupEntity` — Groups table
4. `1761131272137-added-initial-entity` — Additional entities
5. `1761129499953-added-ExpenseEntity` — Expenses table
6. `1761184920704-added-groupEntity` — Group entity updates
7. `1761200000000-added-groupMembers` — Group members table
8. `1770826473184-added-avatar-user-entity` — User avatar
9. `1770968895879-added-split_type-colun-expenseEntity` — Split type enum
10. `1770972491435-added-user-id-expenseShareEntity` — Expense share user ID
11. `1771000000000-added-expense-categories` — Expense categories
12. `1771100000000-added-settlement-entity` — Settlements table
13. `1771200000000-added-password-reset-token` — Password reset tokens

---

## 7. API Endpoints

**Base URL:** `/api`  
**Swagger UI:** `/api` (with Bearer auth support)

### User (`/api/user`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | No | Register new user |
| POST | `/login` | No | Login |
| POST | `/logout` | Yes | Logout |
| POST | `/refresh` | No* | Refresh tokens (*uses refresh cookie) |
| POST | `/forgot-password` | No | Request password reset email |
| POST | `/reset-password` | No | Reset password with token |
| GET | `/` | Yes | Get all users (cached) |
| GET | `/me` | Yes | Get current user |

### Group (`/api/group`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | Yes | Create group |
| GET | `/user` | Yes | Get user's groups |
| GET | `/join/:inviteCode` | Yes | Join group by invite code |
| GET | `/:groupId` | Yes | Get group details |
| GET | `/:groupId/balance` | Yes | Get user balance |
| PATCH | `/:groupId` | Yes (OWNER/ADMIN) | Update group |
| POST | `/:groupId/leave` | Yes | Leave group |
| PATCH | `/:groupId/member/:userId/role` | Yes (OWNER) | Update member role |
| DELETE | `/:groupId/member/:userId` | Yes (OWNER/ADMIN) | Remove member |

### Expense (`/api/expense`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | Yes | Create expense |
| PATCH | `/:id` | Yes | Update expense |
| GET | `/group/:groupId` | Yes | Get expenses by group (paginated) |
| DELETE | `/:id` | Yes | Delete expense |

### Settlement (`/api/settlement`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/group/:groupId` | Yes | Get settlements by group |
| POST | `/` | Yes | Create settlement |

### Notification (`/api/notifications`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Yes | Get user notifications |
| PATCH | `/:id/read` | Yes | Mark as read |

### Health (`/api/health`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | No | Health check (DB, cache) |

---

## 8. Authentication & Authorization

### Authentication Flow

1. **Login/Register** → Access + refresh tokens stored in HttpOnly cookies
2. **Protected routes** → JwtAuthGuard reads `access_token` from cookies
3. **Token expiry** → Client calls `/refresh` with `refresh_token` cookie
4. **Logout** → Tokens invalidated, cookies cleared

### Token Configuration

| Token | Expiry | Cookie |
|-------|--------|--------|
| Access | 15 minutes | `access_token` |
| Refresh | 7 days | `refresh_token` |

### Authorization

- **JwtAuthGuard** — Ensures user is authenticated
- **GroupRolesGuard** — Ensures user has required role in group (OWNER, ADMIN, MEMBER)
- **@Auth()** — Shorthand for `@UseGuards(JwtAuthGuard)`
- **@GroupRoles()** — Specifies required roles for group operations

### Password Reset Flow

1. `POST /api/user/forgot-password` — Sends email with reset link
2. User clicks link with token
3. `POST /api/user/reset-password` — Submits token + new password
4. Tokens stored hashed in DB with expiration

---

## 9. Configuration & Environment

### Environment Files

- `.env.dev` — Development (default if `APP_ENV` not set)
- `.env.test` — Testing
- `.env.production` — Production

### Configuration Keys

| Key | Description |
|-----|-------------|
| `port` | Server port (default: 3001) |
| `APP_ENV` | Environment (dev/test/production) |
| `JWT_SECRET` | Access token signing |
| `JWT_REFRESH_SECRET` | Refresh token signing |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL |
| `CACHE_HOST`, `CACHE_PORT`, `CACHE_PASSWORD` | Redis |
| `frontendUrl` | Frontend URL for CORS |
| Mail config | SMTP for password reset emails |

### CORS

- Origin: `http://localhost:3000`
- Credentials: `true`
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Headers: Content-Type, Authorization, Accept

---

## 10. Security Features

| Feature | Implementation |
|---------|----------------|
| **Headers** | Helmet (CSP, CORP, etc.) |
| **CORS** | Restricted to frontend origin |
| **Cookies** | HttpOnly, SameSite=strict |
| **Passwords** | bcrypt (10 rounds) |
| **JWT** | Signed, expiring tokens |
| **Reset tokens** | Hashed (SHA-256), expiring |
| **Validation** | class-validator, whitelist, forbidNonWhitelisted |
| **SQL injection** | TypeORM parameterized queries |

---

## 11. Infrastructure & DevOps

### NPM Scripts

| Script | Description |
|--------|-------------|
| `start:dev` | Development with watch mode |
| `start` | Production start |
| `start:prod` | Run built app |
| `build` | Production build |
| `migrations:generate` | Generate migration |
| `migrations:up` | Run migrations |
| `migrations:revert` | Revert last migration |
| `test` | Run tests |
| `test:cov` | Coverage report |
| `lint` | ESLint + type-check |
| `type-check` | TypeScript check |

### Docker

- `Dockerfile` present for containerized deployment

---

## 12. Code Quality & Standards

- **TypeScript** — Strict mode, no implicit any
- **ESLint** — Linting with Prettier
- **Validation** — Global ValidationPipe (whitelist, transform, forbidNonWhitelisted)
- **Exception handling** — 4 global filters (HTTP, Validation, NotFound, Custom)
- **Logging** — Pino with trace ID via AsyncLocalStorage
- **Swagger** — API documentation with Bearer auth

---

## 13. Recommendations

1. **Remove debug logs** — Remove `console.log` in production code (e.g., `user.controller.ts` line 63).
2. **Environment-based CORS** — Use `frontendUrl` from config instead of hardcoded `http://localhost:3000`.
3. **Secure cookies in production** — Ensure `secure: true` for cookies when `NODE_ENV === 'production'` (partially implemented).
4. **WebSocket usage** — Socket.io is installed but not used; consider real-time notifications.
5. **Rate limiting** — Add rate limiting for auth endpoints (login, forgot-password).
6. **Test coverage** — Expand unit and E2E tests.
7. **Migration naming** — Standardize migration naming (some typos like `colun`).

---

*Report generated from codebase analysis.*
