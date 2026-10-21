const ticketsController = require('../controllers/tickets.controller');
const searchAnalyticsController = require('../controllers/search-analytics.controller');
const express = require('express');
const router = express.Router();

router.get('/availability', ticketsController.getHistoricalTicketAvailability);
router.get('/usage', searchAnalyticsController.getSearchUsage);
router.post('/loadHistoricalTickets', ticketsController.loadHistoricalTickets);
router.delete('/removeHistoricalTickets', ticketsController.removeHistoricalTickets);
router.get('/search', ticketsController.searchTicketByKeyword);

module.exports = router; 
