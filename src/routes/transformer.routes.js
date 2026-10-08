'use strict';

const { Router } = require('express');
const controller = require('../controllers/transformer.controller');

const router = Router();

router.get('/', controller.listTransformers);
router.get('/:transformerId/meters', controller.getMetersByTransformer);

module.exports = router;
