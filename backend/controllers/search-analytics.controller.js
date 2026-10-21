const pool = require('../db');
const { parseUsageFilters } = require('../search-analytics');

const PAGE_SIZE = 25;

module.exports = {
    getSearchUsage: async function (req, res) {
        const filters = parseUsageFilters(req.query);
        if (filters.error) {
            return res.status(400).json({ error: filters.error });
        }

        const { startDate, endDate, categoryId } = filters;
        const startTimestamp = `${startDate}T00:00:00.000Z`;
        const endDateTime = new Date(`${endDate}T00:00:00.000Z`);
        endDateTime.setUTCDate(endDateTime.getUTCDate() + 1);
        const endTimestamp = endDateTime.toISOString();

        const parameters = [startTimestamp, endTimestamp, categoryId];

        try {
            const summaryResult = await pool.query(`
                SELECT
                    COUNT(*)::int AS total_searches,
                    (COUNT(*) FILTER (WHERE match_found))::int AS successful_matches,
                    (COUNT(*) FILTER (WHERE NOT match_found))::int AS no_match_searches,
                    COALESCE(SUM(match_count), 0)::int AS total_matched_tickets,
                    (
                        SELECT COUNT(*)::int
                        FROM categories c
                        WHERE c.created_at >= $1::timestamp
                          AND c.created_at < $2::timestamp
                    ) AS categories_created,
                    (
                        SELECT COUNT(*)::int
                        FROM tickets t
                        WHERE t.created_at_timestamp >= $1::timestamp
                          AND t.created_at_timestamp < $2::timestamp
                    ) AS tickets_created
                FROM search_usage
                WHERE searched_at >= $1::timestamptz
                  AND searched_at < $2::timestamptz
            `, [startTimestamp, endTimestamp]);
            const detailCountResult = await pool.query(`
                SELECT COUNT(*)::int AS total
                FROM search_usage su
                WHERE su.searched_at >= $1::timestamptz
                  AND su.searched_at < $2::timestamptz
                  AND (
                      $3::integer IS NULL
                      OR EXISTS (
                          SELECT 1
                          FROM search_usage_matches sum
                          WHERE sum.search_id = su.id
                            AND sum.category_id = $3
                      )
                  )
            `, parameters);
            const detailCount = detailCountResult.rows[0].total;
            const pageCount = Math.max(1, Math.ceil(detailCount / PAGE_SIZE));
            const page = Math.min(filters.page, pageCount);
            const offset = (page - 1) * PAGE_SIZE;
            const usageResult = await pool.query(`
                WITH filtered_matches AS (
                    SELECT
                        match.search_id,
                        COUNT(*)::int AS match_count,
                        jsonb_agg(
                            jsonb_build_object(
                                'ticketId', match.ticket_id,
                                'categoryId', match.category_id,
                                'category', match.category_name,
                                'subject', COALESCE(match.ticket_subject, ticket.subject),
                                'status', COALESCE(match.ticket_status, ticket.status),
                                'ticketCreatedAt', COALESCE(match.ticket_created_at, ticket.created_at)
                            ) ORDER BY match.ticket_id
                        ) AS matched_tickets
                    FROM search_usage_matches AS match
                    LEFT JOIN tickets AS ticket ON ticket.ticket_id = match.ticket_id
                    WHERE $3::integer IS NULL OR match.category_id = $3
                    GROUP BY match.search_id
                )
                SELECT
                    su.id,
                    su.search_text,
                    su.searched_at,
                    COALESCE(fm.match_count, 0)::int AS match_count,
                    COALESCE(fm.matched_tickets, '[]'::jsonb) AS matched_tickets
                FROM search_usage su
                LEFT JOIN filtered_matches fm ON fm.search_id = su.id
                WHERE su.searched_at >= $1::timestamptz
                  AND su.searched_at < $2::timestamptz
                  AND ($3::integer IS NULL OR fm.search_id IS NOT NULL)
                ORDER BY su.searched_at DESC, su.id DESC
                LIMIT $4 OFFSET $5
            `, [...parameters, PAGE_SIZE, offset]);
            const categoryResult = await pool.query(`
                SELECT
                    c.id AS category_id,
                    c.name AS category_name,
                    c.created_at AS category_created_at,
                    COUNT(t.id)::int AS ticket_count,
                    COALESCE(
                        jsonb_agg(
                            jsonb_build_object(
                                'ticketId', t.ticket_id,
                                'subject', t.subject,
                                'status', t.status,
                                'createdAt', t.created_at_timestamp
                            ) ORDER BY t.created_at_timestamp DESC, t.ticket_id
                        ) FILTER (WHERE t.id IS NOT NULL),
                        '[]'::jsonb
                    ) AS tickets
                FROM categories c
                LEFT JOIN tickets t
                    ON t.category_id = c.id
                   AND t.created_at_timestamp >= $1::timestamp
                   AND t.created_at_timestamp < $2::timestamp
                WHERE $3::integer IS NULL OR c.id = $3
                GROUP BY c.id, c.name
                ORDER BY c.name
            `, parameters);

            res.json({
                startDate,
                endDate,
                categoryId,
                summary: {
                    totalSearches: summaryResult.rows[0].total_searches,
                    successfulMatches: summaryResult.rows[0].successful_matches,
                    noMatchSearches: summaryResult.rows[0].no_match_searches,
                    totalMatchedTickets: summaryResult.rows[0].total_matched_tickets,
                    categoriesCreated: summaryResult.rows[0].categories_created,
                    ticketsCreated: summaryResult.rows[0].tickets_created
                },
                page,
                pageSize: PAGE_SIZE,
                pageCount,
                detailCount,
                ticketsByCategory: categoryResult.rows.map(row => ({
                    categoryId: row.category_id,
                    category: row.category_name,
                    categoryCreatedAt: row.category_created_at,
                    ticketCount: row.ticket_count,
                    tickets: row.tickets.map(ticket => ({
                        ticketId: ticket.ticketId,
                        subject: ticket.subject,
                        status: ticket.status,
                        createdAt: ticket.createdAt
                    }))
                })),
                searches: usageResult.rows.map(row => ({
                    id: row.id,
                    searchText: row.search_text,
                    searchedAt: row.searched_at,
                    matchFound: row.match_count > 0,
                    matchCount: row.match_count,
                    matchingTickets: row.matched_tickets
                }))
            });
        } catch (error) {
            console.error('Error retrieving search usage:', error);
            res.status(500).json({ error: 'Failed to retrieve search usage' });
        }
    }
};
