require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER_NAME,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function testMatchedWords() {
    try {
        const keyword = "billing invoice login";
        const words = keyword.trim().split(/\s+/).filter(word => word.length > 0);
        
        console.log('Words:', words);
        
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
        
        const combinedTickets = Array.from(ticketMap.values())
            .sort((a, b) => {
                if (b.matchCount !== a.matchCount) {
                    return b.matchCount - a.matchCount;
                }
                return b.relevance - a.relevance;
            })
            .slice(0, 5);
        
        console.log('Combined tickets with matchedWords:');
        combinedTickets.forEach(ticket => {
            console.log(`  ${ticket.ticket_id}: matchCount=${ticket.matchCount}, matchedWords=${JSON.stringify(ticket.matchedWords)}`);
        });
        
        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

testMatchedWords();
