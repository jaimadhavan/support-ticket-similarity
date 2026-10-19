const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { getSearchTerms, isGoodMatch } = require('../search-utils');
const { createLoadSummary } = require('../load-summary');

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
