# Rakshak Expense Management System - Backend

A comprehensive, real-time expense management system backend built with Node.js, Express, MongoDB, and Socket.io.

## 🚀 Features

### Core Features
- **Real-time Updates** - Socket.io integration for instant notifications
- **Multi-level Approval Workflow** - L1, L2, L3 approval system
- **Vehicle KM Tracking** - Site-wise kilometer limits with approval for excess usage
- **Budget Management** - Monthly/yearly budgets with alerts and utilization tracking
- **Role-based Access Control** - 4 user roles with granular permissions
- **File Upload Support** - Receipt attachments with multiple formats
- **Comprehensive Logging** - Winston logger with multiple transport levels
- **Security Hardened** - Rate limiting, input validation, XSS protection

### Advanced Features
- **Audit Trail** - Complete activity tracking for all actions
- **Policy Compliance** - Automated policy violation detection
- **Email Notifications** - Automated email alerts for approvals and budget alerts
- **Report Generation** - Multiple report types with CSV export
- **Dashboard Analytics** - Real-time statistics and insights
- **Scheduled Tasks** - Automated budget checks and report generation

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js 14+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.io
- **Authentication**: JWT with bcrypt
- **Validation**: Joi & express-validator
- **Logging**: Winston
- **File Upload**: Multer & express-fileupload
- **Security**: Helmet, CORS, rate limiting

### Project Structure
```
backend/
├── models/           # MongoDB schemas
│   ├── User.js                # User model with roles and permissions
│   ├── Site.js                # Site model with budget management
│   ├── Expense.js             # Expense model with approval workflow
│   ├── ApprovalHistory.js     # Approval history for expenses
│   ├── Comments.js            # Comments on expenses
│   ├── Notifications.js       # Notification model
│   ├── PendingApprovers.js    # Pending approvers for expenses
│   └── Reports.js             # Report definitions
├── routes/          # API route handlers
│   ├── auth.js      # Authentication routes
│   ├── users.js     # User management
│   ├── sites.js     # Site management
│   ├── expenses.js  # Expense CRUD operations
│   ├── dashboard.js # Dashboard analytics
│   ├── reports.js   # Report generation
│   └── notifications.js # Real-time notifications
├── middleware/      # Custom middleware
│   └── auth.js      # Authentication & authorization
├── services/        # Business logic (e.g., auth.service.js)
├── scripts/         # Utility/startup scripts (e.g., start.js)
├── logs/            # Application logs (e.g., combined.log, error.log)
├── uploads/         # File uploads storage
│   ├── expenses/            # Expense attachments
│   └── profile-pictures/    # User profile pictures
├── tests/           # (Currently empty) Placeholder for backend tests
├── server.js        # Main server file
├── package.json     # Dependencies
├── MONGOOSE_MIGRATION_SUMMARY.md # Database migration summary
├── create-sites.js          # Utility: create initial sites
├── generate-password-hash.js# Utility: generate password hashes
├── test-env.js              # Utility: test environment variables
├── test-mongoose-migration.js # Utility: test mongoose migrations
├── test-server.js           # Utility: test server startup
└── .env                     # Environment variables
```

> **Note:**
> - The project uses two ports: one for the backend API (default: 5000, set via the PORT environment variable) and one for the frontend React app (default: 3000, set via the frontend's configuration). Make sure both are running and the ports do not conflict.
> - The root of the project also contains scripts and guides for deployment and integration, such as `setup-single-port.js`, `SINGLE_PORT_GUIDE.md`, `simple-test.js`, `test-single-port.js`, `test-submit.js`, and `working-backend.js`.
> - The `frontend/` directory contains the React frontend. See its own README or documentation for setup and usage.
> - The `client/` and `server/` directories are present but currently unused/empty.

## 🔧 Installation & Setup

### Prerequisites
- Node.js 14+ installed
- MongoDB running (local or Atlas)
- Git

### Quick Start
1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   Update `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5001         # Backend API port
   FRONTEND_URL=http://localhost:3000  # Frontend URL (default port 3000)
   MONGODB_URI=mongodb://localhost:27017/rakshak-expense
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=24h
   ```
   > **Note:**
   > - The backend runs on the port specified by `PORT` (default: 5001).
   > - The frontend (React app) runs on its own port (default: 3000, see `frontend/package.json` or `frontend/.env`).
   > - Ensure both servers are running and accessible to each other.

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Production Start**
   ```bash
   npm start
   ```

## 🗂️ Utility & Test Scripts

- **create-sites.js**: Script to create initial site entries in the database.
- **generate-password-hash.js**: Utility to generate bcrypt password hashes for user setup.
- **test-env.js**: Script to quickly test if environment variables are loaded correctly.
- **test-mongoose-migration.js**: Script to test mongoose migration logic.
- **test-server.js**: Script to test server startup and basic health.
- **scripts/start.js**: Startup script for custom server initialization.

## 🗃️ Database Migration
- **MONGOOSE_MIGRATION_SUMMARY.md**: Contains details and summary of all mongoose migrations applied to the database.

## 🔐 Authentication & Authorization

### User Roles
- **Submitter** - Can create and submit expenses
- **L1 Approver** - Can approve expenses up to L1 threshold
- **L2 Approver** - Can approve expenses up to L2 threshold + budget management
- **L3 Approver** - Full admin access, can approve any amount + user management

### Permission System
```javascript
permissions: {
  canCreateExpenses: boolean,
  canApproveExpenses: boolean,
  canManageUsers: boolean,
  canManageSites: boolean,
  canViewReports: boolean,
  canManageBudgets: boolean
}
```

## 📡 API Documentation

### Authentication Endpoints
```
POST   /api/auth/register          # User registration
POST   /api/auth/login             # User login
POST   /api/auth/logout            # User logout
GET    /api/auth/me                # Get current user
PUT    /api/auth/profile           # Update user profile
PUT    /api/auth/password          # Change password
POST   /api/auth/forgot-password   # Forgot password
POST   /api/auth/reset-password/:token # Reset password
```

### User Management
```
GET    /api/users                  # Get all users (L3 only)
POST   /api/users                  # Create user (L3 only)
GET    /api/users/:id              # Get user by ID
PUT    /api/users/:id              # Update user
DELETE /api/users/:id              # Delete user (L3 only)
GET    /api/users/role/:role       # Get users by role
```

### Site Management
```
GET    /api/sites                  # Get all sites
POST   /api/sites                  # Create site (L3 only)
GET    /api/sites/:id              # Get site by ID
PUT    /api/sites/:id              # Update site
DELETE /api/sites/:id              # Delete site (L3 only)
PUT    /api/sites/:id/budget       # Update site budget
```

### Expense Management
```
GET    /api/expenses               # Get expenses (filtered by role)
POST   /api/expenses               # Create expense
GET    /api/expenses/:id           # Get expense by ID
PUT    /api/expenses/:id           # Update expense
DELETE /api/expenses/:id           # Delete expense
POST   /api/expenses/:id/submit    # Submit expense for approval
POST   /api/expenses/:id/approve   # Approve expense
POST   /api/expenses/:id/reject    # Reject expense
POST   /api/expenses/:id/cancel    # Cancel expense
GET    /api/expenses/pending       # Get pending approvals
POST   /api/expenses/upload        # Upload expense attachments
```

### Dashboard & Analytics
```
GET    /api/dashboard/overview     # Dashboard overview
GET    /api/dashboard/expense-stats # Expense statistics
GET    /api/dashboard/budget-overview # Budget overview
GET    /api/dashboard/pending-approvals # Pending approvals
GET    /api/dashboard/recent-activity # Recent activity
GET    /api/dashboard/analytics    # Advanced analytics
```

### Reports
```
GET    /api/reports/expense-summary    # Expense summary report
GET    /api/reports/expense-details    # Detailed expense report
GET    /api/reports/budget-utilization # Budget utilization report
GET    /api/reports/vehicle-km         # Vehicle KM report
GET    /api/reports/approval-analytics # Approval analytics
```

### Notifications
```
GET    /api/notifications          # Get user notifications
PUT    /api/notifications/:id/read # Mark notification as read
PUT    /api/notifications/mark-all-read # Mark all as read
GET    /api/notifications/preferences # Get notification preferences
PUT    /api/notifications/preferences # Update preferences
POST   /api/notifications/send    # Send custom notification (L3 only)
```

## 🔄 Real-time Features

### Socket.io Events

#### Client → Server
```javascript
// Join role-based room
socket.emit('join-role-room', userRole);

// Join site-based room
socket.emit('join-site-room', siteId);

// Expense status update
socket.emit('expense-status-update', {
  expenseId,
  status,
  siteId
});

// Budget alert
socket.emit('budget-alert', {
  siteId,
  utilization,
  threshold
});
```

#### Server → Client
```javascript
// Expense updated
socket.on('expense-updated', (data) => {
  // Handle expense update
});

// Budget alert
socket.on('budget-alert', (data) => {
  // Handle budget alert
});

// User activity
socket.on('user-login', (data) => {
  // Handle user login
});

// Notifications
socket.on('notification', (notification) => {
  // Handle real-time notification
});
```

## 💾 Database Schema

### User Schema
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: Enum ['submitter', 'l1_approver', 'l2_approver', 'l3_approver'],
  employeeId: String (unique),
  department: String,
  site: ObjectId (ref: Site),
  phone: String,
  address: Object,
  profilePicture: String,
  isActive: Boolean,
  permissions: Object,
  preferences: Object,
  loginAttempts: Number,
  lockUntil: Date,
  lastLogin: Date
}
```

### Site Schema
```javascript
{
  name: String,
  code: String (unique),
  description: String,
  location: Object,
  contact: Object,
  budget: {
    monthly: Number,
    yearly: Number,
    categories: Object,
    alertThreshold: Number
  },
  vehicleKmLimit: Number,
  operatingHours: Object,
  workingDays: [String],
  departments: [Object],
  expenseCategories: [Object],
  approvalWorkflow: Object,
  settings: Object,
  statistics: Object,
  isActive: Boolean
}
```

### Expense Schema
```javascript
{
  title: String,
  description: String,
  amount: Number,
  currency: String,
  category: Enum,
  expenseDate: Date,
  submittedBy: ObjectId (ref: User),
  site: ObjectId (ref: Site),
  department: String,
  vehicleKm: Object,
  travel: Object,
  accommodation: Object,
  attachments: [Object],
  status: Enum,
  approvalHistory: [Object],
  pendingApprovers: [Object],
  comments: [Object],
  reimbursement: Object,
  auditTrail: [Object],
  policyCompliance: Object
}
```

## 🔒 Security Features

### Authentication Security
- JWT tokens with configurable expiration
- Password hashing with bcrypt (12 rounds)
- Account lockout after failed attempts
- Password strength requirements
- Secure password reset flow

### API Security
- Rate limiting (configurable per endpoint)
- Input validation and sanitization
- XSS protection
- MongoDB injection prevention
- CORS configuration
- Helmet security headers
- File upload restrictions

### Authorization
- Role-based access control
- Permission-based middleware
- Resource ownership validation
- Site-based data isolation
- Business hours restrictions

## 📊 Monitoring & Logging

### Winston Logging
- Multiple log levels (error, warn, info, debug)
- File-based logging with rotation
- Console output for development
- Structured JSON logging
- Error stack traces

### Health Monitoring
```
GET /api/health
```
Returns system health information:
- Server uptime
- Database connection status
- Memory usage
- Environment details

## 🚀 Deployment

### Environment Variables
```env
# Server Configuration
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend-domain.com

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rakshak-expense

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=24h

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# File Upload
MAX_FILE_UPLOAD=10000000
FILE_UPLOAD_PATH=./uploads

# Security
BCRYPT_SALT_ROUNDS=12
```

### Production Checklist
- [ ] Update JWT_SECRET with strong random key
- [ ] Configure MongoDB Atlas connection
- [ ] Set up email service for notifications
- [ ] Configure HTTPS/SSL
- [ ] Set up process manager (PM2)
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategy
- [ ] Update CORS origins
- [ ] Set up log rotation

## 📈 Performance Optimizations

### Database Optimizations
- Compound indexes for common queries
- Aggregation pipelines for analytics
- Connection pooling
- Query optimization

### Caching Strategy
- In-memory caching for frequently accessed data
- Redis integration ready
- Static file caching

### API Optimizations
- Pagination for large datasets
- Field selection for responses
- Compression middleware
- Response caching headers

## 🧪 Testing

### Test Commands
```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
```

### Test Coverage
- Unit tests for models
- Integration tests for routes
- Authentication tests
- Authorization tests
- Socket.io event tests

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Built with ❤️ by ROBUSTRIX Team** 