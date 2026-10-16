require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
    user: process.env.DB_USER_NAME,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Successfully connected to PostgreSQL database');
        release();
    }
});

// Normalize ticket data - ensure all required fields are present
function normalizeTicket(ticket) {
    const requiredFields = ['ticket_id', 'category', 'subject', 'description', 'resolution_notes', 'tags', 'created_at', 'status'];
    
    // Check if all required fields exist and are not null/empty
    for (const field of requiredFields) {
        if (ticket[field] === undefined || ticket[field] === null || ticket[field] === '') {
            return null; // Ticket is not normalized
        }
    }
    
    // Ensure tags is an array
    if (!Array.isArray(ticket.tags)) {
        return null;
    }
    
    return {
        ticket_id: ticket.ticket_id,
        category: ticket.category,
        subject: ticket.subject,
        description: ticket.description,
        resolution_notes: ticket.resolution_notes,
        tags: ticket.tags,
        created_at: ticket.created_at,
        status: ticket.status
    };
}

// API: Load tickets from JSON file
app.post('/api/tickets/load', async (req, res) => {
    try {
        const ticketsPath = path.join(__dirname, '..', 'starter_kit', 'data', 'tickets.json');
        
        if (!fs.existsSync(ticketsPath)) {
            return res.status(404).json({ error: 'tickets.json file not found' });
        }
        
        const rawData = fs.readFileSync(ticketsPath, 'utf8');
        const data = JSON.parse(rawData);
        
        if (!data.tickets || !Array.isArray(data.tickets)) {
            return res.status(400).json({ error: 'Invalid tickets.json format' });
        }
        
        // Normalize tickets
        const normalizedTickets = data.tickets
            .map(ticket => normalizeTicket(ticket))
            .filter(ticket => ticket !== null);
        
        console.log(`Total tickets in file: ${data.tickets.length}`);
        console.log(`Normalized tickets: ${normalizedTickets.length}`);
        
        // Insert tickets with deduplication (ON CONFLICT DO NOTHING)
        let insertedCount = 0;
        let skippedCount = 0;
        
        for (const ticket of normalizedTickets) {
            try {
                const query = `
                    INSERT INTO tickets (ticket_id, category, subject, description, resolution_notes, tags, created_at, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (ticket_id) DO NOTHING
                `;
                
                const result = await pool.query(query, [
                    ticket.ticket_id,
                    ticket.category,
                    ticket.subject,
                    ticket.description,
                    ticket.resolution_notes,
                    ticket.tags,
                    ticket.created_at,
                    ticket.status
                ]);
                
                if (result.rowCount > 0) {
                    insertedCount++;
                } else {
                    skippedCount++;
                }
            } catch (err) {
                console.error(`Error inserting ticket ${ticket.ticket_id}:`, err);
            }
        }
        
        res.json({
            message: 'Tickets loaded successfully',
            total: normalizedTickets.length,
            inserted: insertedCount,
            skipped: skippedCount
        });
    } catch (error) {
        console.error('Error loading tickets:', error);
        res.status(500).json({ error: 'Failed to load tickets' });
    }
});

// API: Search tickets by keyword
app.get('/api/tickets/search', async (req, res) => {
    try {
        const { keyword } = req.query;
        
        if (!keyword) {
            return res.status(400).json({ error: 'Keyword parameter is required' });
        }
        
        // Split the input into individual words for better sentence matching
        const words = keyword.trim().split(/\s+/).filter(word => word.length > 0);
        
        if (words.length === 0) {
            return res.status(400).json({ error: 'Please enter at least one word' });
        }
        
        // If only one word, use simple search
        if (words.length === 1) {
            const query = `
                SELECT 
                    ticket_id,
                    category,
                    subject,
                    description,
                    resolution_notes,
                    tags,
                    created_at,
                    status,
                    ts_rank(
                        to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(description, '') || ' ' || coalesce(resolution_notes, '')),
                        plainto_tsquery('english', $1)
                    ) as relevance
                FROM tickets
                WHERE 
                    to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(description, '') || ' ' || coalesce(resolution_notes, ''))
                    @@ plainto_tsquery('english', $1)
                    OR $1 = ANY(tags)
                ORDER BY relevance DESC, created_at DESC
                LIMIT 5
            `;
            
            const result = await pool.query(query, [keyword]);
            
            // Add matchedWords to each ticket for consistency
            const ticketsWithMatches = result.rows.map(ticket => ({
                ...ticket,
                matchCount: 1,
                matchedWords: [keyword]
            }));
            
            res.json({
                keyword,
                count: ticketsWithMatches.length,
                tickets: ticketsWithMatches
            });
            return;
        }
        
        // For multiple words, search for each word and combine results
        const searchPromises = words.map(word => {
            const query = `
                SELECT 
                    ticket_id,
                    category,
                    subject,
                    description,
                    resolution_notes,
                    tags,
                    created_at,
                    status,
                    ts_rank(
                        to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(description, '') || ' ' || coalesce(resolution_notes, '')),
                        plainto_tsquery('english', $1)
                    ) as relevance
                FROM tickets
                WHERE 
                    to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(description, '') || ' ' || coalesce(resolution_notes, ''))
                    @@ plainto_tsquery('english', $1)
                    OR $1 = ANY(tags)
            `;
            return pool.query(query, [word]);
        });
        
        const results = await Promise.all(searchPromises);
        
        // Combine results and track which words matched each ticket
        const ticketMap = new Map();
        
        results.forEach((result, wordIndex) => {
            const matchedWord = words[wordIndex];
            result.rows.forEach(ticket => {
                const ticketId = ticket.ticket_id;
                if (ticketMap.has(ticketId)) {
                    const existing = ticketMap.get(ticketId);
                    existing.matchCount += 1;
                    existing.matchedWords.push(matchedWord);
                    existing.relevance = Math.max(existing.relevance, ticket.relevance);
                } else {
                    ticketMap.set(ticketId, {
                        ...ticket,
                        matchCount: 1,
                        matchedWords: [matchedWord]
                    });
                }
            });
        });
        
        // Convert to array and sort by match count (descending), then relevance
        const combinedTickets = Array.from(ticketMap.values())
            .sort((a, b) => {
                if (b.matchCount !== a.matchCount) {
                    return b.matchCount - a.matchCount;
                }
                return b.relevance - a.relevance;
            })
            .slice(0, 5); // Limit to top 5 results
        
        res.json({
            keyword,
            words: words,
            count: combinedTickets.length,
            tickets: combinedTickets
        });
    } catch (error) {
        console.error('Error searching tickets:', error);
        res.status(500).json({ error: 'Failed to search tickets' });
    }
});

// API: Get all tickets (for testing)
app.get('/api/tickets', async (req, res) => {
    try {
        const query = 'SELECT * FROM tickets ORDER BY created_at DESC';
        const result = await pool.query(query);
        
        res.json({
            count: result.rows.length,
            tickets: result.rows
        });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

// API: Get ticket by ID
app.get('/api/tickets/:ticketId', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const query = 'SELECT * FROM tickets WHERE ticket_id = $1';
        const result = await pool.query(query, [ticketId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ error: 'Failed to fetch ticket' });
    }
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
