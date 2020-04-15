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
    from: process.env.SENDGRID_EMAIL,
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
  const port = process.env.PORT || 3000;

  const env = process.env.NODE_ENV || 'development';
  let url = '';
  if (env === 'development') {
    url = `http://${host}:${port}/confirm?token=${token}`;
  } else {
    url = `http://http://34.73.25.235/confirm?token=${token}`;
  }

  return sendMail(recipient, 'Account Verification',
      `Verify account with the following link ${url}`);
}

/**
 * Send password reset email to user.
 * @param {String} recipient - whom to send mail to
 * @param {String} token - token to embed in text
 * @return {Promise} promise - promise to sending mail
 */
function passwordResetEmail(recipient, token) {
  const host = 'localhost';
  const port = process.env.PORT || 3000;

  const env = process.env.NODE_ENV || 'development';
  let url = '';
  if (env === 'development') {
    url = `http://${host}:${port}/reset?token=${token}`;
  } else {
    url = `http://http://34.73.25.235/reset?token=${token}`;
  }

  return sendMail(recipient, 'Password Reset',
      `Reset password with the following link ${url}`);
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
      .catch((error) => {
        error.statusCode = 500;
        error.message = 'server failure during finding user';
        throw error;
      })
      .then((user) => {
        if (!user) {
          const error = new Error();
          error.statusCode = 401;
          error.message = 'invalid credentials';
          throw error;
        }

        return bcrypt.compare(_user.password, user.password);
      })
      .then((result) => {
        if (!result) {
          const error = new Error();
          error.statusCode = 401;
          error.message = 'invalid credentials';

          throw error;
        }

        const token = jwt.sign({username: _user.username}, jwtKey, {
          algorithm: 'HS256',
          expiresIn: expiry,
        });

        res.cookie('access_token', token, {
          maxAge: expiry * 1000,
          httpOnly: true,
        });

        return promisify(client.set).bind(client)(_user.username, token)
            .catch((error) => {
              error.statusCode = 500;
              error.message = 'server failure while storing user\'s access token';
              throw error;
            });
      })
      .then((result) => {
        res.status(200).json({error: ''});
      })
      .catch((err) => {
        res.clearCookie('access_token', {path: '/'});
        res.status(err.statusCode).json({error: err.message});
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
    res.json({error: 'Missing token'}).sendStatus(400);
    return;
  }

  const payload = jwt.decode(token);
  client.get(payload.username, function(err, reply) {
    // if we have no token for this user, they are technically
    // logged out.
    if (err) {
      res.status(500).json({error: 'Invalid token payload'});
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
      res.json({error: 'Old access_token'}).status(403);
      return;
    }

    client.del(payload.username, function(err) {
      if (err) {
        res.status(500).json({error: 'Server error'});
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
        return user.save()
            .catch((error) => {
              error.statusCode = 500;
              error.message = 'Unable to create user';
              throw error;
            });
      })
      .then((user) => {
        const token = new Token({
          _userId: user._id,
          email: user.email,
          token: crypto.randomBytes(16).toString('hex'),
        });

        return token.save()
            .catch((error) => {
              error.statusCode = 500;
              error.message = 'Unable to create verification token';
              throw error;
            });
      })
      .then((token) => {
        return accountVerificationEmail(token.email, token.token)
            .catch((error) => {
              error.statusCode = 500;
              error.message = 'Unable to send verfication email';
              throw error;
            });
      })
      .then(() => {
        res.sendStatus(200);
      })
      .catch((error) => {
        console.log(error);
        res.status(error.statusCode).json({error: error.message});
      });
};

/**
 * Verifies user in DB.
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
const confirm = async (req, res) => {
  const token = req.body.token;
  const email = req.body.email;
  Token.findOne({token: token})
      .catch((error) => {
        error.statusCode = 500;
        error.message = 'server failure during token find';
        throw error;
      })
      .then((token) => {
        if (!token) {
          const error = new Error();
          error.statusCode = 400;
          error.message = 'token not found';

          throw error;
        }

        return User.findOne({email: email}).catch((error) => {
          error.statusCode = 500;
          error.message = 'server failure during user find';
          throw error;
        });
      })
      .then((user) => {
        if (!user) {
          const error = new Error();
          error.statusCode = 400;
          error.message = 'user not found';

          throw error;
        }
        if (user.verified) {
          const error = new Error();
          error.statusCode = 400;
          error.message = 'user already verified';

          throw error;
        }

        user.verified = true;
        return user.save().catch((error) => {
          error.statusCode = 500;
          error.message = 'server failure during user update';
          throw error;
        });
      })
      .then(() => {
        res.sendStatus(200);
      })
      .catch((err) => {
        res.status(err.statusCode).json({error: err.message});
      });
};

const resend = async (req, res) => {
  const email = req.body.email;
  User.findOne({email: email})
      .then((user) => {
        // Prevent user enumeration
        if (!user) {
          const error = new Error();
          error.statusCode = 200;
          error.message = '';
          throw error;
        }
        if (user.verified) {
          const error = new Error();
          error.statusCode = 200;
          error.message = '';
          throw error;
        }

        user.verification_token = crypto.randomBytes(16).toString('hex');
        return user.save().catch((error) => {
          error.statusCode = 500;
          error.message = 'server failure saving user verification token';
          throw error;
        });
      })
      .then((user) => {
        const token = new Token({
          _userId: user._id,
          email: user.email,
          token: user.token,
        });

        return token.save().catch((error) => {
          error.statusCode = 500;
          error.message = 'server failure saving verification token';
          throw error;
        });
      })
      .then((token) => {
        return accountVerification(user.email, token.token).catch((error) => {
          error.statusCode = 500;
          error.message = 'server failure sending verification email';
          throw error;
        });
      })
      .then(() => {
        res.status(200).json({error: ''});
      })
      .catch((err) => {
        res.status(err.statusCode).json({error: err.message});
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
      .catch((error) => {
        error.statusCode = 500;
        error.message = 'server failure during user search';
        throw error;
      })
      .then((user) => {
        if (!user) {
          // We want to avoid user enumeration.
          const error = new Error();
          error.statusCode = 200;
          error.message = '';

          throw error;
        }

        user.reset_token = generateTokenString();
        return user.save().catch((error) => {
          error.statusCode = 500;
          error.message = 'server failure during user update';
          throw error;
        });
      })
      .then((user) => {
        const token = new Token({
          _userId: user._id,
          email: user.email,
          token: user.reset_token,
        });

        return token.save().catch((error) => {
          error.statusCode = 500;
          error.message = 'server failure during token save';
          throw error;
        });
      })
      .then((token) => {
        return passwordResetEmail(email, token.token).catch((error) => {
          error.statusCode = 500;
          error.message = 'server failure during sending of token via email';
          throw error;
        });
      })
      .then(() => {
        res.status(200).json({error: ''});
      })
      .catch((err) => {
        res.status(err.statusCode).json({error: err.message});
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
        .catch((error) => {
          error.statusCode = 500;
          error.message = 'server failure during token search';
          throw error;
        })
        .then((token) => {
          if (!token) {
            const error = new Error();
            error.statusCode = 401;
            error.message = 'token not found';

            throw error;
          }

          return User.findById(token._userId).catch((error) => {
            error.statusCode = 500;
            error.message = 'server failure during finding user';
            throw error;
          });
        })
        .then((user) => {
          if (!user) {
            const error = new Error();
            error.statusCode = 409;
            error.message = 'user for this token not found';

            throw error;
          }

          if (user.reset_token !== resetToken) {
            const error = new Error();
            error.statusCode = 403;
            error.message = 'reset token is not valid, probably expired';

            throw error;
          }

          user.reset_token = null;
          return changePasswordImpl(user, newPassword).catch((error) => {
            error.statusCode = 500;
            error.message = 'server failure during updating user\'s password';
            throw error;
          });
        })
        .then((user) => {
          res.status(200).json({error: ''});
        })
        .catch((err) => {
          res.json({error: err.message}).status(err.statusCode);
        });
  } else if (accessToken) {
    const payload = jwt.decode(accessToken);
    User.findOne({username: payload.username})
        .then((user) => {
          if (!user) {
            const error = new Error();
            error.statusCode = 409;
            error.message = 'user for this token not found';

            throw error;
          }

          return changePasswordImpl(user, newPassword).catch((error) => {
            error.statusCode = 500;
            error.message = 'server failure during update user\'s password';
            throw error;
          });
        })
        .then((user) => {
          res.status(200).error({error: ''});
        })
        .catch((err) => {
          res.json({error: err.message}).status(err.statusCode);
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
