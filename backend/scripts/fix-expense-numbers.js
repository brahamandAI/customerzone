const mongoose = require('mongoose');
require('dotenv').config();

// Import all models
require('./models/User');
require('./models/Site');
require('./models/Expense');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('✅ Connected to MongoDB');
  
  try {
    // Get Expense model
    const Expense = require('./models/Expense');
    
    console.log('\n🔧 Fixing Expense Numbers...\n');
    
    // Find all expenses with timestamp-based numbers
    const expenses = await Expense.find({ 
      isActive: true, 
      isDeleted: false,
      expenseNumber: { $regex: /^EXP-\d{10,}$/ } // Find numbers with 10+ digits (timestamps)
    });
    
    console.log(`📊 Found ${expenses.length} expenses with timestamp-based numbers:\n`);
    
    let updatedCount = 0;
    
    for (const expense of expenses) {
      // Generate new 4-digit number
      const generateExpenseNumber = () => {
        const random = Math.floor(1000 + Math.random() * 9000); // Generates number between 1000-9999
        return `EXP-${random}`;
      };
      
      const newExpenseNumber = generateExpenseNumber();
      
      console.log(`🔄 Updating: ${expense.expenseNumber} → ${newExpenseNumber}`);
      console.log(`   Title: ${expense.title}`);
      console.log(`   Amount: ₹${expense.amount.toLocaleString()}`);
      console.log(`   Status: ${expense.status}`);
      console.log('');
      
      // Update the expense number
      await Expense.updateOne(
        { _id: expense._id },
        { expenseNumber: newExpenseNumber }
      );
      
      updatedCount++;
    }
    
    console.log(`✅ Successfully updated ${updatedCount} expense numbers!`);
    
    // Verify the changes
    console.log('\n🔍 Verifying updated expenses:\n');
    const updatedExpenses = await Expense.find({ isActive: true, isDeleted: false })
      .sort({ updatedAt: -1 })
      .limit(5);
    
    updatedExpenses.forEach((expense, index) => {
      console.log(`${index + 1}. Expense Number: ${expense.expenseNumber}`);
      console.log(`   Title: ${expense.title}`);
      console.log(`   Amount: ₹${expense.amount.toLocaleString()}`);
      console.log(`   Status: ${expense.status}`);
      
      // Check if expense number is in correct format
      const isValidFormat = /^EXP-\d{4}$/.test(expense.expenseNumber);
      console.log(`   Format Valid: ${isValidFormat ? '✅' : '❌'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}); 