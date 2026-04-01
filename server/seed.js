import 'dotenv/config';
import prisma from './prismaClient.js';
import { hashPassword } from './utils.js';

const input = process.argv[2];

async function createAdminUser(input) {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: input }
    });

    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email:', existingAdmin.email);
      return;
    }

    // Create new admin user
    const hashedPassword = await hashPassword('admin123'); // Change this password!
    
    const admin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: input,
        password: hashedPassword,
        role: 'ADMIN',
        phone: null
      }
    });

    console.log(' Admin user created successfully!');
    console.log('Email:', admin.email);
    console.log('Password: admin123');
    console.log('\n  Please change the password after first login!');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser(input);
