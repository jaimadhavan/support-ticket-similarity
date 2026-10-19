function createLoadSummary(total, inserted, invalid, duplicates, failed) {
    const skipped = invalid + duplicates + failed;
    const message = failed > 0
        ? 'Tickets loaded with insertion errors'
        : invalid > 0
            ? 'Tickets loaded; invalid records were skipped'
            : 'Tickets loaded successfully';

    return { message, total, inserted, skipped, invalid, duplicates, failed };
}

module.exports = { createLoadSummary };
