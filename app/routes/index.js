const express = require('express');
const router = new express.Router();

router.use('/auth', require('./auth').router);
router.use('/confirm', require('./confirm').router);

router.get('/', (req, res) => {
  res.send('Parking Manager API v1.0.0');
});

module.exports = {
  router,
};

