const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseUsageFilters(query) {
    const startDate = parseDate(query.startDate);
    const endDate = parseDate(query.endDate);
    if (!startDate || !endDate) {
        return { error: 'Valid startDate and endDate are required (YYYY-MM-DD)' };
    }
    if (startDate > endDate) {
        return { error: 'startDate must be on or before endDate' };
    }

    let categoryId = null;
    if (query.categoryId !== undefined && query.categoryId !== '') {
        categoryId = Number(query.categoryId);
        if (!Number.isInteger(categoryId) || categoryId < 1) {
            return { error: 'categoryId must be a positive integer' };
        }
    }

    const page = query.page === undefined ? 1 : Number(query.page);
    if (!Number.isSafeInteger(page) || page < 1) {
        return { error: 'page must be a positive integer' };
    }

    return { startDate, endDate, categoryId, page };
}

async function recordSearchUsage(pool, searchText, tickets) {
    const client = await pool.connect();
    let transactionStarted = false;
    try {
        await client.query('BEGIN');
        transactionStarted = true;
        const result = await client.query(`
            INSERT INTO search_usage (search_text, match_found, match_count)
            VALUES ($1, $2, $3)
            RETURNING id
        `, [searchText, tickets.length > 0, tickets.length]);

        if (tickets.length > 0) {
            await client.query(`
                INSERT INTO search_usage_matches (
                    search_id,
                    ticket_id,
                    category_id,
                    category_name,
                    ticket_subject,
                    ticket_status,
                    ticket_created_at
                )
                SELECT
                    $1,
                    item.ticket_id,
                    item.category_id,
                    item.category_name,
                    item.ticket_subject,
                    item.ticket_status,
                    item.ticket_created_at
                FROM unnest(
                    $2::text[],
                    $3::integer[],
                    $4::text[],
                    $5::text[],
                    $6::text[],
                    $7::date[]
                ) AS item(
                    ticket_id,
                    category_id,
                    category_name,
                    ticket_subject,
                    ticket_status,
                    ticket_created_at
                )
            `, [
                result.rows[0].id,
                tickets.map(ticket => ticket.ticket_id),
                tickets.map(ticket => ticket.category_id),
                tickets.map(ticket => ticket.category),
                tickets.map(ticket => ticket.subject),
                tickets.map(ticket => ticket.status),
                tickets.map(ticket => ticket.created_at)
            ]);
        }

        await client.query('COMMIT');
    } catch (error) {
        if (transactionStarted) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Failed to roll back search usage transaction:', rollbackError);
            }
        }
        throw error;
    } finally {
        client.release();
    }
}

function parseDate(value) {
    if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
        return null;
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
        ? value
        : null;
}

module.exports = { parseUsageFilters, recordSearchUsage };
