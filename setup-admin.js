require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kp_web2';

// Admin schema (must match server.js)
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Admin = mongoose.model('Admin', adminSchema);

// List of admin accounts to create
const adminsToCreate = [
    {
        username: 'krishna7256',
        password: 'Krishna@7256'
    },
    {
        username: 'bhaskar2001',
        password: 'Bhaskar@2001'
    }
];

async function createAdminUsers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to MongoDB');

        console.log('Creating admin accounts...\n');

        for (const adminData of adminsToCreate) {
            try {
                // Check if admin already exists
                const existingAdmin = await Admin.findOne({ username: adminData.username });
                if (existingAdmin) {
                    console.log(`Admin "${adminData.username}" already exists - skipping`);
                    continue;
                }

                // Hash password
                const salt = await bcrypt.genSalt(10);
                const passwordHash = await bcrypt.hash(adminData.password, salt);

                // Create admin user
                const admin = new Admin({
                    username: adminData.username,
                    passwordHash: passwordHash
                });

                await admin.save();
                console.log('Created admin account:');
                console.log('Username:', adminData.username);
                console.log('Password:', adminData.password);
                console.log('-------------------');

            } catch (error) {
                console.error(`Error creating admin "${adminData.username}":`, error.message);
            }
        }

        console.log('\nAdmin account creation completed!');
        console.log('Please save these credentials and delete this file after use!');

    } catch (error) {
        console.error('Database connection error:', error);
    } finally {
        process.exit(0);
    }
}

createAdminUsers();