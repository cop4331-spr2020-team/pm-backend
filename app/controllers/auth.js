const bcrypt = require('bcrypt');
const User = require('../models/user');

const saltRounds = process.env.SALT_ROUNDS | 12;

/**
 * Returns a schema User model from a request.
 * @param {Object} req - request object
 * @return {Schema} user - Mongoose Schema for User model.
 */
function userObject(req) {
  const body = req.body;

  const user = new User({
    first_name: body.first_name,
    last_name: body.last_name,
    email: body.email,
    username: body.username,
    password: body.password,
  });

  return user;
}

/**
 * Asynchronous login, assigning jwt for further API calls.
 * Fails if user is not verified.
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
const login = async (req, res) => {
  const _user = userObject(req);
  User.find({username: _user.username})
      .then((user) => {
        if (!user) {
          res.sendStatus(401);
        }

        bcrypt.compare(_user.password, user.password)
            .then((result) => {
              if (!result) {
                res.sendStatus(401);
              }
              else if (!user.verified) {
                res.sendStatus(403);
              } else {
                
              }

            })
            .catch((err) => {

            });

        

      })
      .catch((err) => {

      });
};

/**
 * Asynchronous logout, invalidating jwt passed in req.
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
const logout = async (req, res) => {

};

/**
 * Asynchronous sign up for user, with awaiting verification.
 * We assume that once we are here, all fields are valid.
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
const signup = async (req, res) => {
  const user = userObject(req);
  const origPassword = user.password;
  bcrypt.hash(origPassword, saltRounds)
      .then((hashedPassword) => {
        user.password = hashedPassword;
        user.save()
            .then(() => {
              res.sendStatus(200);
            })
            .catch((err) => {
              res.sendStatus(400);
            });
      })
      .catch((err) => {
        res.sendStatus(400);
      });
};

/**
 * Verifies user in DB.
 * @param {Object} req - request object 
 * @param {Object} res - response object 
 */
const confirm = async (req, res) => {

};

/**
 * Sends reset token to user email, allowing future changePassword without jwt.
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
const reset = async (req, res) => {

};

/**
 * Changes a user's password using a reset token, or jwt.
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
const changePassword = async (req, res) => {

};

module.exports = {
  login,
  logout,
  signup,
  confirm,
  reset,
  changePassword,
}