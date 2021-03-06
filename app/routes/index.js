const express = require('express');
const router = new express.Router();

router.use('/auth', require('./auth').router);
router.use('/confirm', require('./confirm').router);
router.use('/tickets', require('./ticket').router);

router.get('/', (req, res) => {
  res.send('Parking Manager API v1.0.0');
});

router.get('/enums', (req, res) => {
  res.json({
    'violations': [
      'No Tag',
      'Expired Tag',
      'Improper Parking',
    ],
    'locations': [
      'Garage A',
      'Garage B',
      'Garage C',
    ],
    'status': [
      'Rejected',
      'Submitted',
      'Completed',
    ],
  });
});

module.exports = {
  router,
};

