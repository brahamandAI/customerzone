# 🏢 Rakshak Expense Management System

A comprehensive full-stack expense management system built with React.js, Node.js, Express, and MongoDB. Features multi-level approval workflows, budget management, and vehicle kilometer tracking.

## 🚀 Features

### 📊 **Core Features**
- **Multi-level Approval Workflow** (L1, L2, L3 approvers)
- **Role-based Access Control** (Submitter, Approvers, Admin)
- **Budget Management** with site-wise allocation
- **Vehicle KM Tracking** with limit enforcement
- **Real-time Budget Alerts**
- **Comprehensive Reporting**

### 🔐 **Authentication & Security**
- JWT-based authentication 
- Password hashing with bcrypt
- Role-based permissions
- Secure API endpoints 
- Rate limiting protection

### 📱 **User Interface**
- Modern, responsive design
- Material-UI components
- Camera integration for receipts
- File upload functionality
- Real-time notifications

### 🏗️ **Technical Features**
- RESTful API architecture
- MongoDB with Mongoose ODM
- React Context for state management
- Proper error handling
- Environment-based configuration

## 🛠️ Tech Stack

### **Frontend**
- React.js 18+
- Material-UI (MUI)
- React Router
- Axios for API calls
- Camera API integration

### **Backend**
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- bcrypt for password hashing
- Multer for file uploads

### **Development Tools**
- Concurrently for running both servers
- Nodemon for backend development
- Environment variables for configuration

## 📁 Project Structure

```
rakshak-expense-management/
├── backend/                    # Node.js backend
│   ├── middleware/            # Authentication middleware
│   ├── models/               # MongoDB models
│   │   ├── User.js
│   │   ├── Site.js
│   │   └── Expense.js
│   ├── routes/               # API routes
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── sites.js
│   │   └── expenses.js
│   ├── server.js            # Main server file
│   └── package.json         # Backend dependencies
├── frontend/                 # React frontend
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── context/         # React Context
│   │   ├── pages/           # Page components
│   │   └── App.js           # Main App component
│   └── package.json         # Frontend dependencies
├── package.json             # Root package.json
└── README.md               # This file
```

## 🚀 Getting Started

### **Prerequisites**
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/rakshak-expense-management.git
   cd rakshak-expense-management
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   
   Create `.env` file in the backend directory:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/rakshak-expense
   FRONTEND_URL=http://localhost:3000
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=24h
   BCRYPT_ROUNDS=12
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on http://localhost:5000
   - Frontend server on http://localhost:3000

### **Individual Server Commands**

```bash
# Start backend only
npm run server

# Start frontend only
npm run client

# Install backend dependencies
npm run install-server

# Install frontend dependencies
npm run install-client

# Build frontend for production
npm run build
```

## 🔑 Default User Roles

The system supports 4 user roles:

1. **Submitter** - Submit expenses
2. **L1 Approver** - Regional Manager level approval
3. **L2 Approver** - Admin level approval
4. **L3 Approver** - Finance level approval (Admin access)

## 📊 API Endpoints

### **Authentication**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/refresh` - Refresh token

### **Users**
- `GET /api/users/all` - Get all users (Admin)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile
- `PUT /api/users/:id/password` - Change password
- `PUT /api/users/:id/role` - Update user role (Admin)

### **Sites**
- `GET /api/sites/all` - Get all sites
- `POST /api/sites/create` - Create new site
- `GET /api/sites/:id` - Get site by ID
- `PUT /api/sites/:id/budget` - Update site budget
- `GET /api/sites/budget-alerts` - Get budget alerts

### **Expenses**
- `GET /api/expenses/all` - Get all expenses
- `POST /api/expenses/create` - Create new expense
- `GET /api/expenses/pending` - Get pending expenses
- `GET /api/expenses/:id` - Get expense by ID
- `PUT /api/expenses/:id/approve` - Approve/reject expense

## 🔧 Configuration

### **Environment Variables**

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | 5000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/rakshak-expense |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | JWT expiration time | 24h |
| `BCRYPT_ROUNDS` | Password hashing rounds | 12 |

## 🚀 Deployment

### **Production Build**
```bash
npm run build
```

### **Heroku Deployment**
The project is configured for Heroku deployment with the `heroku-postbuild` script.

1. Create a Heroku app
2. Set environment variables
3. Deploy the code
4. The build process will automatically run

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Team

**Developed by ROBUSTRIX**
- Email: contact@robustrix.com
- Website: www.robustrix.com

## 📞 Support

For support and queries:
- Email: support@robustrix.com
- Phone: +91-XXXXXXXXXX

---

**© 2025 Rakshak Securitas - All Rights Reserved** 