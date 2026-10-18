require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const ticketsRoute = require('./routes/tickets.route');
const app = express();
const PORT = process.env.PORT || 3000;
const pool = require('./db');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/tickets', ticketsRoute);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    await pool.end();
    process.exit(0);
});
