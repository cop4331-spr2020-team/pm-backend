const express = require('express');
const router = new express.Router();
const controller = require('../controllers/auth');
const validate = require('../controllers/auth.validate');

router.post(
    '/login',
    validate.login,
    controller.login,
);

router.post(
    '/logout',
    controller.logout,
);

router.post(
    '/signup',
    validate.signup,
    controller.signup,
);

router.post(
    '/signup/confirm',
    validate.confirm,
    controller.confirm,
);

router.post(
    '/reset',
    validate.reset,
    controller.reset,
);

router.post(
    '/change_password',
    validate.changePassword,
    controller.changePassword,
);

router.get(
    '/user_info',
    validate.isLoggedIn,
    controller.getUserInfo,
);

module.exports = {
  router,
};

