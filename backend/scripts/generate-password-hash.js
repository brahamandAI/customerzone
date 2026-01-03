const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'Admin@123';
  const hashedPassword = await bcrypt.hash(password, 12);
  console.log('Hashed password for Admin@123:');
  console.log(hashedPassword);
}

generateHash(); 