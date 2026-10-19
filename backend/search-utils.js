const STOP_WORDS = new Set([
    'a', 'about', 'after', 'again', 'all', 'also', 'am', 'an', 'and', 'any',
    'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'between',
    'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing', 'down',
    'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
    'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his',
    'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me',
    'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off',
    'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out',
    'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
    'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
    'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until',
    'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while',
    'who', 'whom', 'why', 'will', 'with', 'you', 'your', 'yours', 'yourself',
    'yourselves',
    'customer', 'customers', 'data', 'error', 'errors', 'getting', 'integration',
    'integrations', 'issue', 'issues', 'many', 'new', 'newer', 'problem',
    'problems', 'seen', 'something', 'support', 'sync', 'ticket', 'tickets',
    'type', 'types'
]);

const MIN_MATCHED_TERMS = 2;

function getSearchTerms(text) {
    const terms = String(text || '').toLowerCase().match(/[a-z0-9]+/g) || [];
    return [...new Set(terms.filter(term => term.length > 2 && !STOP_WORDS.has(term)))];
}

function isGoodMatch(matchedTerms, queryTerms) {
    const matchedCount = new Set(matchedTerms || []).size;
    return queryTerms.length === 1
        ? matchedCount === 1
        : matchedCount >= MIN_MATCHED_TERMS;
}

module.exports = {
    getSearchTerms,
    isGoodMatch,
    MIN_MATCHED_TERMS
};
