const { promisify } = require("util");
const {check, cookie} = require('express-validator');
const User = require('../models/user');
const auth = require('../controllers/auth');

const signup = [
  check('first_name').not().isEmpty(),
  check('last_name').not().isEmpty(),
  check('email').isEmail().normalizeEmail().custom((email) => {
    return User.find({email: email}).then((user) => {
      if (user) {
        return Promise.reject(new Error('E-mail already in use.'));
      }
    });
  }),
  check('username').not().isEmpty().custom((username) => {
    return User.find({username: username}).then((user) => {
      if (user) {
        return Promise.reject(new Error('Username already in use.'));
      }
    });
  }),
  check('password').not().isEmpty(),
  check('password_confirmation').not().isEmpty().custom((password, {req}) => {
    if (password !== req.body.password) {
      return Promise.reject(new Error('Password confirmation does not match'));
    }
  }),
];

const isLoggedIn = async (req, res, next) => {
  const accessToken = req.cookies.access_token;
  const payload = auth.jwt.decode(accessToken);
  const error = new Error();
  if (!payload) {
    error.statusCode = 401;
    error.message = 'invalid access_token';
    req.error = error;
    next();
    return;
  }
  promisify(auth.client.get).bind(auth.client)(payload.username)
      .catch((error) => {
        error.statusCode = 500;
        error.message = 'error finding access_token';
        req.error = error;
        next();
        return;
      })
      .then((reply) => {
        if (!reply) {
          error.statusCode = 401;
          error.message = 'invalid access_token';
          req.error = error;
          next();
          return;
        }
        if (reply !== accessToken) {
          error.statusCode = 401;
          error.message = 'invalid access_token';
          req.error = error;
          next();
          return;
        }
        console.log('hooray');
        req.username = payload.username;
        console.log(req.username);
        next();
      });
};

const login = [
];

const confirm = [

];

const reset = [

];

const changePassword = [

];

module.exports = {
  signup,
  login,
  confirm,
  reset,
  require,
  changePassword,
  isLoggedIn,
};
