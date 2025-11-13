const axios = require('axios');

// Create another L2 approver user with admin-like credentials
async function createAdminL2() {
  console.log('👤 Creating Admin L2 Approver user...\n');
  
  const baseURL = 'http://localhost:5001/api';
  
  try {
    // 1. Check server status
    console.log('1️⃣ Checking server status...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('✅ Server is running');
    console.log(`📊 Uptime: ${Math.round(healthResponse.data.uptime)} seconds`);
    console.log('');
    
    // 2. Get available sites
    console.log('2️⃣ Getting available sites...');
    const sitesResponse = await axios.get(`${baseURL}/sites/all`);
    const sites = sitesResponse.data.data;
    console.log(`✅ Found ${sites.length} sites`);
    console.log('');
    
    // 3. Create admin-like L2 approver user
    console.log('3️⃣ Creating Admin L2 Approver user...');
    
    const adminUser = {
      name: 'Admin L2 Approver',
      email: 'adminl2@rakshaksecuritas.com',
      password: 'Rakshak@123',
      role: 'l2_approver',
      employeeId: 'ADMINL2001',
      department: 'Administration',
      site: sites[0]._id, // Use first available site
      phone: '9876543210',
      isActive: true
    };
    
    try {
      const createResponse = await axios.post(`${baseURL}/auth/register`, adminUser);
      console.log('✅ Admin L2 User created successfully!');
      console.log(`👤 Name: ${createResponse.data.user.name}`);
      console.log(`📧 Email: ${createResponse.data.user.email}`);
      console.log(`🎭 Role: ${createResponse.data.user.role}`);
      console.log(`🏢 Site: ${createResponse.data.user.site?.name || 'No Site'}`);
      console.log(`🔑 Token: ${createResponse.data.token.substring(0, 20)}...`);
      
      console.log('\n🎉 SUCCESS! Use these credentials to login:');
      console.log(`📧 Email: ${adminUser.email}`);
      console.log(`🔑 Password: ${adminUser.password}`);
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ User creation failed: ${error.response.status} - ${error.response.data.message || error.response.statusText}`);
        
        if (error.response.status === 409) {
          console.log('ℹ️  User already exists, trying to login...');
          
          // Try to login with existing user
          const loginResponse = await axios.post(`${baseURL}/auth/login`, {
            email: adminUser.email,
            password: adminUser.password
          });
          
          console.log('✅ Login successful with existing user!');
          console.log(`👤 User: ${loginResponse.data.user.name}`);
          console.log(`🎭 Role: ${loginResponse.data.user.role}`);
          
          console.log('\n🎉 SUCCESS! Use these credentials to login:');
          console.log(`📧 Email: ${adminUser.email}`);
          console.log(`🔑 Password: ${adminUser.password}`);
        }
      } else {
        console.log(`❌ User creation failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

createAdminL2();
