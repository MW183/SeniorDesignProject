import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

client.connect((err) => {
  if (err) {
    console.error('❌ Full error object:', err);
    console.error('Error code:', err.code);
    console.error('Error name:', err.name);
    process.exit(1);
  }
  console.log('✅ Connected successfully!');
  client.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Query error:', err);
    } else {
      console.log('Current time:', res.rows[0]);
    }
    client.end();
  });
});