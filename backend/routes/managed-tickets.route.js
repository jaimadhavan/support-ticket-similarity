const express = require('express');
const controller = require('../controllers/tickets.controller');
const router = express.Router();

router.get('/', controller.listManagedTickets);
router.post('/', controller.createManagedTicket);
router.put('/:ticketId', controller.updateManagedTicket);
router.delete('/:ticketId', controller.deleteManagedTicket);

module.exports = router;
