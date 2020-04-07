const redis = require('redis');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Token = require('../models/token');
const sgMail = require('@sendgrid/mail');
const promisify = require('util').promisify;

const expiry = Number(process.env.EXPIRY);
const jwtKey = process.env.JWT_KEY;
const saltRounds = Number(process.env.SALT_ROUNDS);
const redisPassword = process.env.REDIS_PASSWORD;
const redisEndpoint = process.env.REDIS_ENDPOINT;
const redisEndpointPort = Number(process.env.REDIS_ENDPOINT_PORT);

const client = redis.createClient(redisEndpointPort, redisEndpoint);
client.auth(redisPassword);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Generates a random token string.
 * @return {String} token - randomly generated token string
 */
function generateTokenString() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Returns a schema User model from a request.
 * @param {Object} req - request object
 * @return {Schema} user - Mongoose Schema for User model
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
 * Returns the 'access_token' cookie from a request.
 * @param {Object} req - request object
 * @return {Token} tkn - jwt 'access_token'
 */
function tokenCookie(req) {
  const cookie = req.cookies.access_token;
  return cookie;
}

/**
 * Sends mail to reciepient, using standard mail.
 * @param {String} recipient - whom to send mail to
 * @param {String} subject - subject heading for mail
 * @param {String} text - body of mail
 * @return {Promise} promise - promise of sending mail
 */
function sendMail(recipient, subject, text) {
  const mail = {
    from: 'marloncalv98@gmail.com',
    to: recipient,
    subject: subject,
    text: text,
  };

  return sgMail.send(mail);
}

/**
 * Send verification email to recipient, with token.
 * @param {String} recipient - whom to send mail to
 * @param {String} token - token to embed in text
 * @return {Promise} promise - promise of sending mail
 */
function accountVerificationEmail(recipient, token) {
  const host = 'localhost';
  const port = process.env.PORT | 3000;
  return sendMail(recipient, 'Account Verification',
      `Verify account with the following link http://${host}:${port}/confirm?token=${token}`);
}

/**
 * Send password reset email to user.
 * @param {String} recipient - whom to send mail to
 * @param {String} token - token to embed in text
 * @return {Promise} promise - promise to sending mail
 */
function passwordResetEmail(recipient, token) {
  const host = 'localhost';
  const port = process.env.PORT | 3000;
  return sendMail(recipient, 'Password Reset',
      `Reset password with the following link http://${host}:${port}/reset?token=${token}`);
}

/**
 * Asynchronous login, assigning jwt for further API calls.
 * Fails if user is not verified.
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
const login = async (req, res) => {
  const _user = userObject(req);
  User.findOne({username: _user.username})
      .then((user) => bcrypt.compare(_user.password, user.password))
      .then((result) => {
        if (!result) {
          throw new Error('Password unmatched');
        }

        const token = jwt.sign({username: _user.username}, jwtKey, {
          algorithm: 'HS256',
          expiresIn: expiry,
        });

        res.cookie('access_token', token, {
          maxAge: expiry * 1000,
          httpOnly: true,
        });

        return promisify(client.set).bind(client)(_user.username, token);
      })
      .then((result) => {
        res.sendStatus(200);
      })
      .catch((err) => {
        res.clearCookie('access_token', {path: '/'});
        res.sendStatus(401);
      });
};

/**
 * Asynchronous logout, invalidating jwt passed in req.
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
const logout = async (req, res) => {
  const token = tokenCookie(req);

  if (!token) {
    res.json({err: 'Missing token'}).sendStatus(400);
    return;
  }

  const payload = jwt.decode(token);
  client.get(payload.username, function(err, reply) {
    // if we have no token for this user, they are technically
    // logged out.
    if (err) {
      res.status(500).json({err: 'Invalid token payload'});
      return;
    }
    if (!reply) {
      res.cookie('access_token', 'deleted', {
        expires: new Date(Date.now() - 900000),
        httpOnly: true,
      });
      res.sendStatus(200);
      return;
    }
    if (reply.toString() !== token) {
      res.json({err: 'Old access_token'}).status(403);
      return;
    }

    client.del(payload.username, function(err) {
      if (err) {
        res.status(500).json({err: 'Server error'});
        return;
      }

      res.cookie('access_token', 'deleted', {
        expires: new Date(Date.now() - 900000),
        httpOnly: true,
      });
      res.sendStatus(200);
    });
  });
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
        return user.save();
      })
      .then((user) => {
        const token = new Token({
          _userId: user._id,
          email: user.email,
          token: crypto.randomBytes(16).toString('hex'),
        });

        return token.save();
      })
      .then((token) => {
        return accountVerificationEmail('marloncalv98@gmail.com', token.token);
      })
      .then(() => {
        res.sendStatus(200);
      })
      .catch((err) => {
        console.log(err);
        res.sendStatus(500);
      });
};
//$2b$12$feuM56mkrBFywhpk7KNoVOvxPvA2ziufAjREC81nzOtSgAla1I2Pe
/**
 * Verifies user in DB.
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
const confirm = async (req, res) => {
  const token = req.body.token;
  const email = req.body.email;
  Token.findOne({token: token})
      .then((token) => {
        if (!token) {
          throw new Error('Token not found.');
        }

        return User.findOne({email: email});
      })
      .then((user) => {
        if (!user) throw new Error('User not found.');
        if (user.verified) throw new Error('User already verified');

        user.verified = true;
        return user.save();
      })
      .then(() => {
        res.sendStatus(200);
      })
      .catch((err) => {
        console.log(err);
        res.sendStatus(401);
      });
};

const resend = async (req, res) => {
  const email = req.body.email;
  User.findOne({email: email})
      .then((user) => {
        if (!user) {
          throw new Error('User not found.');
        }
        if (user.verified) {
          throw new Error('User already verified.');
        }

        const token = new Token({
          _userId: user._id,
          email: email,
          token: crypto.randomBytes(16).toString('hex'),
        });

        return token.save();
      })
      .then((token) => {
        return accountVerification(user.email, token.token);
      })
      .then(() => {
        res.sendStatus(200);
      })
      .catch((err) => {
        console.log(err);
      });
};
/**
 * Sends reset token to user email, allowing future changePassword without jwt.
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
const reset = async (req, res) => {
  const email = req.body.email;
  User.findOne({email: email})
      .then((user) => {
        if (!user) {
          throw new Error('User not found.');
        }

        user.reset_token = generateTokenString();
        return user.save();
      })
      .then((user) => {
        const token = new Token({
          _userId: user._id,
          email: user.email,
          token: user.reset_token,
        });

        return token.save();
      })
      .then((token) => {
        return passwordResetEmail(email, token.token);
      })
      .then(() => {
        res.sendStatus(200);
      })
      .catch((err) => {
        console.log(err);
        res.sendStatus(403);
      });
};

/**
 * Changes a user's password using a reset token, or jwt.
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
const changePassword = async (req, res) => {
  const accessToken = tokenCookie(req);
  const resetToken = req.body.reset_token;
  const newPassword = req.body.new_password;

  if (resetToken) {
    Token.findOneAndDelete({token: resetToken})
        .then((token) => {
          if (!token) {
            throw new Error('Token not found.');
          }

          return User.findById(token._userId);
        })
        .then((user) => {
          if (!user) {
            throw new Error('User not found.');
          }

          if (user.reset_token !== resetToken) {
            throw new Error('Token does not match user\'s reset token.');
          }

          user.reset_token = null;
          return changePasswordImpl(user, newPassword);
        })
        .then((user) => {
          res.sendStatus(200);
        })
        .catch((err) => {
          console.log(err);
          res.sendStatus(500);
        });
  } else if (accessToken) {
    const payload = jwt.decode(accessToken);
    User.findOne({username: payload.username})
        .then((user) => {
          if (!user) {
            throw new Error('User not found.');
          }

          return changePasswordImpl(user, newPassword);
        })
        .then((user) => {
          res.sendStatus(200);
        })
        .catch((err) => {
          res.sendStatus(500);
        });
  }
};

/**
 * Changes password for user.
 * @param {User} user - user defined schema
 * @param {String} newPassword - new password to change
 * @return {Promise} promise - promise to change password
 */
function changePasswordImpl(user, newPassword) {
  return bcrypt.hash(newPassword, saltRounds)
      .then((hashedPassword) => {
        user.password = hashedPassword;
        return user.save();
      });
}

module.exports = {
  login,
  logout,
  signup,
  confirm,
  reset,
  changePassword,
};
