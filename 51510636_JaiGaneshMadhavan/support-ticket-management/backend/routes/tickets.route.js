const ticketsController = require('../controllers/tickets.controller');
const express = require('express');
const router = express.Router();

router.get('/availability', ticketsController.getHistoricalTicketAvailability);
router.post('/loadHistoricalTickets', ticketsController.loadHistoricalTickets);
router.delete('/removeHistoricalTickets', ticketsController.removeHistoricalTickets);
router.get('/search', ticketsController.searchTicketByKeyword);

module.exports = router; 
