/* ════════════════════════════════════════════════════════════════════
   POF GMS — Database Seed Script
   *** PREVIOUS VERSION seeded sample members — that has been removed ***
   Run with: npm run seed
   Creates ONLY the manager account + default shift config.
   No sample members are created — users manage their own data.
   ════════════════════════════════════════════════════════════════════ */

require('dotenv').config();
const sequelize = require('./config/db');
const { User, Member, Shift } = require('./models');

async function seed() {
  try {
    console.log('\n🚀 POF GMS Seed Script Starting...\n');

    // 1. Sync all tables (creates them if they don't exist)
    await sequelize.sync({ force: true }); // WARNING: force:true drops existing tables
    console.log('✅  Tables created successfully.\n');

    // 2. Create manager account (the only pre-created user)
    const admin = await User.create({
      full_name: 'Gym Manager',
      username: 'manager',
      email: process.env.SMTP_USER || 'manager@pofgms.local', // Uses your real email from .env
      password_hash: 'pofgym123',    // Will be bcrypt hashed by the model hook
      role: 'manager',
    });
    console.log(`✅  Manager account created`);
    console.log(`    Username: manager`);
    console.log(`    Password: pofgym123`);
    console.log(`    Email:    ${admin.email}`);
    console.log(`    Role:     manager\n`);

    // 3. Create default shift configurations
    const categories = ['POF Employee', 'Son of POF Employee', 'Civilian'];
    for (const cat of categories) {
      await Shift.create({
        category: cat,
        morning_start: '06:00',
        morning_end: '10:00',
        evening_start: '16:00',
        evening_end: '20:00',
        night_start: '20:00',
        night_end: '22:00',
      });
    }
    console.log('✅  Default shift configurations created.\n');

    // NOTE: No sample members are seeded — users add their own data

    console.log('═══════════════════════════════════════════');
    console.log('  🎉  DATABASE SEEDED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════');
    console.log('\n  Credentials:');
    console.log('  Manager → username: manager / password: pofgym123');
    console.log('\n  Next steps:');
    console.log('  1. Run: npm run dev');
    console.log('  2. Open: http://localhost:5000');
    console.log('  3. Login as manager or create a new staff account\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌  Seed failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seed();
