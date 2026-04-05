import 'dotenv/config';
import prisma from '../prismaClient.js';

async function testSupabaseConnection() {
  try {
    console.log('Testing Prisma connection to Supabase...\n');

    // Check DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    console.log('DATABASE_URL points to:', dbUrl.includes('supabase') ? 'Supabase' : ' Local/Other');
    console.log('');

    // Query users
    const users = await prisma.user.findMany();
    console.log(` Users found: ${users.length}`);
    users.forEach(u => console.log(`  - ${u.email} (${u.role})`));
    console.log('');

    // Query wedding template
    const templates = await prisma.weddingTemplate.findMany();
    console.log(` Templates found: ${templates.length}`);
    templates.forEach(t => console.log(`  - ${t.name} v${t.version}`));
    console.log('');

    // Query template categories
    const categories = await prisma.templateCategory.findMany();
    console.log(` Template categories found: ${categories.length}`);
    console.log('');

    // Query template tasks
    const tasks = await prisma.templateTask.findMany();
    console.log(` Template tasks found: ${tasks.length}`);
    console.log('\nAll data is being read from Supabase successfully! ');

  } catch (error) {
    console.error('✗ Error connecting to Supabase:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testSupabaseConnection();
