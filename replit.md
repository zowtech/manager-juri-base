# Legal Case Management System - replit.md

## Overview

This is a full-stack legal case management system built with React, Express, and PostgreSQL. The application provides a professional interface for law firms to manage legal cases, track activities, and monitor case progress through a comprehensive dashboard system.

## User Preferences

Preferred communication style: Simple, everyday language.

## Authentication System (Updated July 2025)

### Test Accounts
- **Admin Access**: admin/admin123 (full system access)
- **Limited Access**: lucas.silva/barone13 (cases only, no dashboard)

### Permission Features
- **Automatic Redirection**: Users without dashboard access redirect to their allowed pages
- **Role-based Access**: Granular permissions for pages, fields, and actions
- **Database-driven**: All permissions stored and read from PostgreSQL
- **Smart Navigation**: Navigation menu shows only accessible pages

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom BASE FACILITIES branding
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit OAuth integration with session management
- **Session Storage**: PostgreSQL-based sessions using connect-pg-simple
- **Development**: Hot reload with Vite integration

### Database Design (Updated August 2025)
- **Database**: PostgreSQL via Supabase (migrated from Neon for user independence)
- **Migration**: Successfully completed August 2025 - user now has complete independence
- **Schema Management**: Drizzle Kit for migrations
- **Key Tables**:
  - `users` - User profiles and roles (admin/editor) with permissions system
  - `cases` - Legal case data with status tracking
  - `employees` - Employee database with 11-column Excel schema support
  - `activity_log` - Audit trail for all system actions
  - `sessions` - Authentication session storage
  - `dashboard_layouts` - User dashboard customization

## Key Components

### Authentication System
- **Provider**: Replit OAuth with OpenID Connect
- **Session Management**: Server-side sessions with PostgreSQL storage
- **Authorization**: Role-based access control (admin/editor roles)
- **Security**: Secure HTTP-only cookies with CSRF protection

### Employee Management System (Updated August 2025)
- **Excel Schema**: Full 11-column support (Empresa|Nome|Matrícula|RG|PIS|Data Admissão|Data Demissão|Salário|Cargo|Centro Custo|Departamento)
- **Database Schema**: Updated PostgreSQL tables with all Excel columns
- **Search Interface**: Professional table-based layout with advanced search modal
- **Navigation**: Default route corrected to open Dashboard on login
- **Manual Entry**: Complete forms with all 11 Excel fields for data entry

### Case Management (Updated August 2025)
- **Field Structure**: Matrícula, Nome, Processo, Prazo de entrega, Audiência, Status
- **Process Tags**: Comma-separated processes display as individual badges for analytics
- **Status System**: NOVOS → PENDENTES → CONCLUÍDOS + ATRASADOS (automatic calculation)
- **Smart Ordering**: Always sorted by deadline (most urgent first), not alphabetical
- **Visual Alerts**: Red (overdue), Yellow (approaching deadline within 3 days), Green (safe)
- **Automatic Status**: Cases past deadline auto-marked as "atrasado" regardless of current status
- **Dashboard Integration**: Live counters show Resultados, Concluídos, Pendentes, Atrasados (ordem específica conforme design)
- **Advanced Filtering**: Multi-column filters including matrícula, nome, status, date, and process search
- **Professional UI**: Enhanced table with borders, professional styling, and responsive design
- **Automatic Date Tracking**: Data de entrega automatically set when status changes to "concluído"
- **Update System**: Fixed PATCH endpoint validation for seamless case editing

### Process Analytics
- **Tag Visualization**: Process fields split by commas into individual badges
- **Dashboard Integration**: Process tag frequency tracking for legal department insights
- **Responsive Design**: Mobile-friendly tag display with elegant wrapping

### Activity Logging
- **Comprehensive Audit**: All user actions are logged with timestamps
- **Contextual Information**: IP addresses, user agents, and action descriptions
- **Filtering**: Activity logs can be filtered by action type and date

### Dashboard Analytics
- **Case Statistics**: Total, completed, in-progress case counts
- **Performance Metrics**: Average response time calculations
- **Visual Charts**: Pie charts for status distribution, line charts for trends
- **Real-time Updates**: Live data refresh using React Query

## Data Flow

### Client-Server Communication
1. **API Requests**: RESTful endpoints with consistent error handling
2. **Authentication Flow**: OAuth redirect → session creation → API access
3. **State Synchronization**: React Query manages server state caching
4. **Error Handling**: Centralized error management with user-friendly messages

### Database Operations
1. **Query Layer**: Drizzle ORM provides type-safe database queries
2. **Connection Pooling**: Neon serverless handles connection management
3. **Transaction Support**: ACID compliance for data integrity
4. **Migration System**: Schema changes managed through Drizzle Kit

## External Dependencies

### Core Technologies
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit Auth**: OAuth authentication provider
- **Radix UI**: Accessible component primitives
- **Recharts**: Chart visualization library

### Development Tools
- **Vite**: Fast build tool with HMR
- **TypeScript**: Type safety across the stack
- **Tailwind CSS**: Utility-first styling
- **ESBuild**: Production bundle optimization

## Deployment Strategy

### Development Environment
- **Hot Reload**: Vite dev server with backend proxy
- **Database**: Neon serverless connection
- **Environment Variables**: DATABASE_URL, SESSION_SECRET, REPL_ID

### Production Build
- **Frontend**: Static assets built to `dist/public`
- **Backend**: Bundled Node.js server in `dist/index.js`
- **Startup**: Single production server serving static files and API

### Environment Configuration (Updated August 2025)
- **Database**: Supabase PostgreSQL (user's independent instance)
- **Authentication**: Custom session-based with local strategy  
- **Sessions**: Secure session management with TTL
- **Independence**: Complete user independence achieved - no external dependencies

### Render Deployment Configuration (August 2025)
- **Platform**: Render.com with automatic deployments
- **Build System**: Custom build scripts (build-render.js) for optimized bundling
- **Build Command**: `npm install && node build-render.js`
- **Start Command**: `npm start` (serves bundled dist/index.js)
- **Environment**: NODE_ENV=production, DATABASE_URL from Supabase
- **Files**: render.yaml, build-render.js, start-render.js, INSTRUCOES-RENDER.md
- **Port Configuration**: Dynamic PORT from Render (defaults to 5000)
- **Static Assets**: Frontend served from dist/public/
- **Database**: Supabase connection via DATABASE_URL environment variable

The system follows a monorepo structure with clear separation between client, server, and shared code, making it maintainable and scalable for legal case management workflows.