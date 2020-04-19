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
    return Promise.reject(error);
  }
  promisify(auth.client.get).bind(auth.client)(payload.username)
      .catch((error) => {
        next();
        return Promise.reject(new Error('Unable to find access_token'));
      })
      .then((reply) => {
        if (!reply) {
          next();
          return Promise.reject(new Error('Unable to find access_token'));
        }
        if (reply !== accessToken) {
          next();
          return Promise.reject(new Error('Old access_token'));
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
