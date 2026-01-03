const mongoose = require('mongoose');
const Site = require('./models/Site');
require('dotenv').config();

async function createSites() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rakshak-expense');
    console.log('Connected to MongoDB');

    // Create test sites
    const sites = [
      {
        name: 'Mumbai Site A',
        code: 'MSA-001',
        description: 'Main Mumbai office',
        location: {
          address: 'MG Road, Andheri West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400058',
          country: 'India'
        },
        budget: {
          monthly: 200000,
          yearly: 2400000,
          alertThreshold: 80
        },
        isActive: true,
        createdBy: new mongoose.Types.ObjectId() // Dummy ObjectId
      },
      {
        name: 'Delhi Site B',
        code: 'DSB-001',
        description: 'Delhi regional office',
        location: {
          address: 'Connaught Place',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          country: 'India'
        },
        budget: {
          monthly: 300000,
          yearly: 3600000,
          alertThreshold: 80
        },
        isActive: true,
        createdBy: new mongoose.Types.ObjectId() // Dummy ObjectId
      },
      {
        name: 'Chennai Site C',
        code: 'CSC-001',
        description: 'Chennai branch office',
        location: {
          address: 'Anna Salai',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600002',
          country: 'India'
        },
        budget: {
          monthly: 150000,
          yearly: 1800000,
          alertThreshold: 80
        },
        isActive: true,
        createdBy: new mongoose.Types.ObjectId() // Dummy ObjectId
      },
      {
        name: 'Bangalore Site D',
        code: 'BSD-001',
        description: 'Bangalore tech hub',
        location: {
          address: 'Electronic City',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560100',
          country: 'India'
        },
        budget: {
          monthly: 250000,
          yearly: 3000000,
          alertThreshold: 80
        },
        isActive: true,
        createdBy: new mongoose.Types.ObjectId() // Dummy ObjectId
      }
    ];

    // Check if sites already exist
    for (const siteData of sites) {
      const existingSite = await Site.findOne({ code: siteData.code });
      if (!existingSite) {
        const newSite = new Site(siteData);
        await newSite.save();
        console.log(`✅ Created site: ${siteData.name} (${siteData.code})`);
      } else {
        console.log(`⏭️  Site already exists: ${siteData.name} (${siteData.code})`);
      }
    }

    console.log('\n🎉 Sites creation completed!');
    console.log('\n📋 Available sites:');
    const allSites = await Site.find({ isActive: true });
    allSites.forEach(site => {
      console.log(`- ${site.name} (${site.code})`);
    });

  } catch (error) {
    console.error('❌ Error creating sites:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createSites(); 