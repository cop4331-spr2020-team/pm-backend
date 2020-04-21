const express = require('express');
const router = new express.Router();
const controller = require('../controllers/ticket');
const validator = require('../controllers/ticket.validate');
const checkLogin = require('../controllers/auth.validate').isLoggedIn;
const multer = require('multer');
const upload = multer({dest: 'uploads/'});

/**
 * Create ticket.
 */
router.post(
    '/create',
    checkLogin,
    upload.single('image'),
    validator.createTicket,
    controller.createTicket,
);

/**
 * Get ticket information by query.
 */
router.get(
    '/query',
    checkLogin,
    validator.getTickets,
    controller.getTickets,
);

/**
 * Get ticket statistics by query.
 */
router.get(
    '/stats',
    checkLogin,
    validator.getStatTickets,
    controller.getStatTickets,
);

/**
 * Get ticket information.
 */
router.get(
    '/:ticket_id',
    checkLogin,
    validator.getTicket,
    controller.getTicket,
);

/**
 * Update ticket.
 */
router.post(
    '/:ticket_id',
    checkLogin,
    upload.single('image'),
    validator.updateTicket,
    controller.updateTicket,
);

module.exports = {
  router,
};


