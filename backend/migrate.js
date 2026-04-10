import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL ? {rejectUnauthorized: false} : false,
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('Running database migration...');

        // Read schema file
        const schemaPath = path.join(__dirname, 'config', 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        if (!schemaSql || schemaSql.trim().length === 0) {
            throw new Error(`Schema file is empty: ${schemaPath}`);
        }

        // Execute schema
        await client.query(schemaSql);

        const { rows: tableRows } = await client.query(
            `select table_schema, table_name
             from information_schema.tables
             where table_type = 'BASE TABLE'
               and table_schema not in ('pg_catalog','information_schema')
             order by table_schema, table_name`
        );

        if (tableRows.length === 0) {
            throw new Error('Migration ran but no tables were found afterward (check DATABASE_URL / schema.sql).');
        }

        console.log('Database migration completed successfully');
        console.log('Tables found:');
        for (const t of tableRows) {
            console.log(` - ${t.table_schema}.${t.table_name}`);
        }

    }
    catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    } 
    finally {
        client.release();
        await pool.end();
        console.log('Database migration completed');
    }
}

runMigration();