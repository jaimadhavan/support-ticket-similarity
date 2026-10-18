const ticketsController = require('../controllers/tickets.controller');
const express = require('express');
const router = express.Router();

router.post('/loadHistoricalTickets', ticketsController.loadHistoricalTickets);
router.delete('/removeHistoricalTickets', ticketsController.removeHistoricalTickets);
router.get('/search', ticketsController.searchTiketByKeyword);
router.get('/', ticketsController.getAllTickets);
router.get('/:ticketId', ticketsController.searchByTicketId);

module.exports = router; 
