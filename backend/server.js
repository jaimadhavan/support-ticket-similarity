require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const ticketsRoute = require('./routes/tickets.route');
const categoriesRoute = require('./routes/categories.route');
const managedTicketsRoute = require('./routes/managed-tickets.route');
const app = express();
const PORT = process.env.PORT || 3000;
const pool = require('./db');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/tickets', ticketsRoute);
app.use('/api/categories', categoriesRoute);
app.use('/api/admin/tickets', managedTicketsRoute);

app.use((req, res) => {
    res.status(404).json({
        error: `Route not found: ${req.method} ${req.originalUrl}`
    });
});


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
