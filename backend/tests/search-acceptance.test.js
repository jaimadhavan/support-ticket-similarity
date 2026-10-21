const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { getSearchTerms, isGoodMatch } = require('../search-utils');
const { createLoadSummary } = require('../load-summary');
const { parseUsageFilters, recordSearchUsage } = require('../search-analytics');

const seed = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', '..', 'starter_kit', 'data', 'tickets.json'),
    'utf8'
)).tickets;
const incoming = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', '..', 'starter_kit', 'data', 'new_tickets_example.json'),
    'utf8'
)).new_tickets;

function findFixtureMatches(ticket) {
    const queryTerms = getSearchTerms(`${ticket.subject} ${ticket.description}`);
    return seed
        .filter(candidate => candidate.status.toLowerCase() === 'resolved')
        .map(candidate => {
            const text = [
                candidate.subject,
                candidate.description,
                candidate.resolution_notes,
                ...(candidate.tags || [])
            ].join(' ');
            const candidateTerms = new Set(getSearchTerms(text));
            const matchedWords = queryTerms.filter(term => candidateTerms.has(term));
            return { ...candidate, matchedWords };
        })
        .filter(candidate => isGoodMatch(candidate.matchedWords, queryTerms))
        .sort((a, b) => b.matchedWords.length - a.matchedWords.length);
}

test('incoming login ticket finds the password-reset resolution', () => {
    const matches = findFixtureMatches(incoming.find(ticket => ticket.ticket_id === 'NT-1'));
    assert.equal(matches[0]?.ticket_id, 'T-1001');
    assert.ok(matches[0].matchedWords.includes('password'));
    assert.ok(matches[0].matchedWords.includes('reset'));
});

test('incoming chart ticket finds the blank-revenue-chart resolution', () => {
    const matches = findFixtureMatches(incoming.find(ticket => ticket.ticket_id === 'NT-2'));
    assert.equal(matches[0]?.ticket_id, 'T-1201');
    assert.ok(matches[0].matchedWords.includes('chart'));
    assert.ok(matches[0].matchedWords.includes('revenue'));
});

test('incoming duplicate-charge ticket finds the duplicate-billing resolution', () => {
    const matches = findFixtureMatches(incoming.find(ticket => ticket.ticket_id === 'NT-3'));
    assert.equal(matches[0]?.ticket_id, 'T-1303');
    assert.ok(matches[0].matchedWords.includes('charged'));
    assert.ok(matches[0].matchedWords.includes('twice'));
});

test('unfamiliar Snowflake ticket does not surface a weak precedent', () => {
    const matches = findFixtureMatches(incoming.find(ticket => ticket.ticket_id === 'NT-4'));
    assert.deepEqual(matches, []);
});

test('a single descriptive search term can surface an exact term match', () => {
    assert.equal(isGoodMatch(['saml'], ['saml']), true);
    assert.equal(isGoodMatch(['integration'], ['integration', 'snowflake']), false);
});

test('load summary accounts for every source record, including failures', () => {
    const summary = createLoadSummary(4, 1, 1, 1, 1);
    assert.equal(summary.total, 4);
    assert.equal(summary.skipped, 3);
    assert.equal(summary.inserted + summary.skipped, summary.total);
    assert.equal(summary.message, 'Tickets loaded with insertion errors');
});

test('duplicate-only skips are reported without implying an insertion failure', () => {
    const summary = createLoadSummary(4, 2, 0, 2, 0);
    assert.equal(summary.skipped, 2);
    assert.equal(summary.failed, 0);
    assert.equal(summary.message, 'Tickets loaded successfully');
});

test('search usage filters validate dates, category, and page', () => {
    assert.deepEqual(
        parseUsageFilters({
            startDate: '2026-10-01',
            endDate: '2026-10-21',
            categoryId: '4',
            page: '2'
        }),
        {
            startDate: '2026-10-01',
            endDate: '2026-10-21',
            categoryId: 4,
            page: 2
        }
    );
    assert.equal(
        parseUsageFilters({ startDate: '2026-02-30', endDate: '2026-03-01' }).error,
        'Valid startDate and endDate are required (YYYY-MM-DD)'
    );
    assert.equal(
        parseUsageFilters({ startDate: '2026-10-22', endDate: '2026-10-21' }).error,
        'startDate must be on or before endDate'
    );
    assert.equal(
        parseUsageFilters({ startDate: '2026-10-01', endDate: '2026-10-21', categoryId: '0' }).error,
        'categoryId must be a positive integer'
    );
});

test('search usage stores search text and matched tickets in one transaction', async () => {
    const calls = [];
    const client = {
        query: async (sql, params) => {
            calls.push({ sql: sql.trim(), params });
            return sql.includes('RETURNING id') ? { rows: [{ id: 17 }] } : { rows: [] };
        },
        release: () => calls.push({ sql: 'RELEASE' })
    };
    await recordSearchUsage({ connect: async () => client }, 'billing duplicate', [{
        ticket_id: 'T-1303',
        category_id: 3,
        category: 'billing',
        subject: 'Duplicate charge',
        status: 'resolved',
        created_at: '2026-10-20'
    }]);

    assert.equal(calls[0].sql, 'BEGIN');
    assert.deepEqual(calls[1].params, ['billing duplicate', true, 1]);
    assert.deepEqual(calls[2].params, [
        17,
        ['T-1303'],
        [3],
        ['billing'],
        ['Duplicate charge'],
        ['resolved'],
        ['2026-10-20']
    ]);
    assert.match(calls[2].sql, /ticket_subject/);
    assert.match(calls[2].sql, /ticket_status/);
    assert.match(calls[2].sql, /ticket_created_at/);
    assert.equal(calls[3].sql, 'COMMIT');
    assert.equal(calls[4].sql, 'RELEASE');
});

test('search usage records no-match attempts without matched-ticket rows', async () => {
    const calls = [];
    const client = {
        query: async (sql, params) => {
            calls.push({ sql: sql.trim(), params });
            return sql.includes('RETURNING id') ? { rows: [{ id: 18 }] } : { rows: [] };
        },
        release: () => calls.push({ sql: 'RELEASE' })
    };
    await recordSearchUsage({ connect: async () => client }, 'unfamiliar product', []);

    assert.deepEqual(calls[1].params, ['unfamiliar product', false, 0]);
    assert.equal(calls.some(call => call.sql.includes('INSERT INTO search_usage_matches')), false);
    assert.equal(calls[2].sql, 'COMMIT');
});

test('search usage rolls back and surfaces persistence failures', async () => {
    const calls = [];
    const failure = new Error('insert failed');
    const client = {
        query: async sql => {
            calls.push(sql.trim());
            if (sql.includes('INSERT INTO search_usage ')) {
                throw failure;
            }
            return { rows: [] };
        },
        release: () => calls.push('RELEASE')
    };
    await assert.rejects(recordSearchUsage({ connect: async () => client }, 'invoice', []), failure);
    assert.equal(calls[0], 'BEGIN');
    assert.match(calls[1], /INSERT INTO search_usage/);
    assert.deepEqual(calls.slice(2), ['ROLLBACK', 'RELEASE']);
});
