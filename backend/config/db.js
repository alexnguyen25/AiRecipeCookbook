import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL ? {rejectUnauthorized: false} : false,
});

pool.on('connect', () => {  
    console.log('Connected to the database');
});

pool.on('error', (err) => {
    console.error('Error with the database', err);
    process.exit(1);
});

export default {
    query: (text, params) => pool.query(text, params),
};