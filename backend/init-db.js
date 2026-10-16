require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: process.env.DB_USER_NAME,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function initializeDatabase() {
    try {
        console.log('Connecting to database...');
        await pool.connect();
        console.log('Connected successfully');

        console.log('Reading schema.sql...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema...');
        await pool.query(schema);
        console.log('Database schema created successfully');

        console.log('\nDatabase initialization complete!');
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

initializeDatabase();
