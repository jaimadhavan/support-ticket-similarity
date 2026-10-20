const express = require('express');
const controller = require('../controllers/categories.controller');
const router = express.Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.put('/:categoryId', controller.update);
router.delete('/:categoryId', controller.softDelete);

module.exports = router;
