import pg from 'pg';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

// Force IPv4 only
dns.setDefaultResultOrder('ipv4first');

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000
});

client.connect((err) => {
  if (err) {
    console.error('❌ Full error object:', err);
  } else {
    console.log('✅ Connected successfully!');
    client.end();
  }
});