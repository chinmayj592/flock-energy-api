'use strict';

const { Router } = require('express');
const controller = require('../controllers/meter.controller');

const router = Router();

router.get('/', controller.listMeters);
router.get('/:meterId', controller.getMeterDetail);
router.get('/:meterId/location', controller.getMeterLocation);
router.get('/:meterId/consumption', controller.getMeterConsumption);

module.exports = router;
