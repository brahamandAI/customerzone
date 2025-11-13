const axios = require('axios');

// Create a new L2 approver user via API
async function createL2User() {
  console.log('👤 Creating new L2 Approver user...\n');
  
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
    console.log(`✅ Found ${sites.length} sites:`);
    sites.forEach((site, index) => {
      console.log(`   ${index + 1}. ${site.name} (${site.code})`);
    });
    console.log('');
    
    // 3. Try to create a new L2 approver user
    console.log('3️⃣ Creating new L2 Approver user...');
    
    const newUser = {
      name: 'Test L2 Approver',
      email: 'l2test@rakshaksecuritas.com',
      password: 'Test123!',
      role: 'l2_approver',
      employeeId: 'L2TEST001',
      department: 'Administration',
      site: sites[0]._id, // Use first available site
      phone: '9876543210',
      isActive: true
    };
    
    try {
      const createResponse = await axios.post(`${baseURL}/auth/register`, newUser);
      console.log('✅ User created successfully!');
      console.log(`👤 Name: ${createResponse.data.user.name}`);
      console.log(`📧 Email: ${createResponse.data.user.email}`);
      console.log(`🎭 Role: ${createResponse.data.user.role}`);
      console.log(`🏢 Site: ${createResponse.data.user.site?.name || 'No Site'}`);
      console.log(`🔑 Token: ${createResponse.data.token.substring(0, 20)}...`);
      
      // Test login with new user
      console.log('\n4️⃣ Testing login with new user...');
      const loginResponse = await axios.post(`${baseURL}/auth/login`, {
        email: newUser.email,
        password: newUser.password
      });
      
      console.log('✅ Login successful!');
      console.log(`👤 User: ${loginResponse.data.user.name}`);
      console.log(`🎭 Role: ${loginResponse.data.user.role}`);
      
      // Test dashboard access
      console.log('\n5️⃣ Testing dashboard access...');
      const dashboardResponse = await axios.get(`${baseURL}/dashboard/overview`, {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.token}`
        }
      });
      
      console.log('✅ Dashboard access successful!');
      console.log('📊 Dashboard data keys:', Object.keys(dashboardResponse.data.data));
      
      // Test expenses access
      console.log('\n6️⃣ Testing expenses access...');
      const expensesResponse = await axios.get(`${baseURL}/expenses/all`, {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.token}`
        }
      });
      
      console.log('✅ Expenses access successful!');
      console.log(`📊 Total expenses: ${expensesResponse.data.data.length}`);
      
      // Check if we can see expenses from different sites
      const siteCounts = {};
      expensesResponse.data.data.forEach(expense => {
        const siteName = expense.site?.name || 'Unknown Site';
        siteCounts[siteName] = (siteCounts[siteName] || 0) + 1;
      });
      
      console.log('\n📊 Expenses by Site:');
      Object.entries(siteCounts).forEach(([site, count]) => {
        console.log(`   ${site}: ${count} expenses`);
      });
      
      console.log('\n🎉 SUCCESS! L2 Approver can access all sites data!');
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ User creation failed: ${error.response.status} - ${error.response.data.message || error.response.statusText}`);
        
        if (error.response.status === 409) {
          console.log('ℹ️  User already exists, trying to login...');
          
          // Try to login with existing user
          const loginResponse = await axios.post(`${baseURL}/auth/login`, {
            email: newUser.email,
            password: newUser.password
          });
          
          console.log('✅ Login successful with existing user!');
          console.log(`👤 User: ${loginResponse.data.user.name}`);
          console.log(`🎭 Role: ${loginResponse.data.user.role}`);
          
          // Test dashboard access
          const dashboardResponse = await axios.get(`${baseURL}/dashboard/overview`, {
            headers: {
              'Authorization': `Bearer ${loginResponse.data.token}`
            }
          });
          
          console.log('✅ Dashboard access successful!');
          console.log('📊 Dashboard data keys:', Object.keys(dashboardResponse.data.data));
        }
      } else {
        console.log(`❌ User creation failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

createL2User();
