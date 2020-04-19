const check = require('express-validator');
const User = require('../models/user');
const auth = require('../controllers/auth');

const client = redis.createClient(redisEndpointPort, redisEndpoint);
client.auth(redisPassword);

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
      Promise.reject(new Error('Password confirmation does not match'));
    }
  }),
];

const isLoggedIn = [
  cookie('access_token').not().isEmpty().custom((accessToken, {req}) => {
    const payload = auth.jwt.decode(accessToken);
    auth.client.get(payload.username, function(err, reply) {
      if (err || !reply) {
        Promise.reject(new Error('Unable to find access_token'));
      }

      if (reply !== accessToken) {
        Promise.reject(new Error('Old access_token'));
      }

      req.username = payload.username;
    });
  }),
];

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
