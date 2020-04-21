require('./config/env');

const cors = require('cors');
const morgan = require('morgan');
const express = require('express');
const appRoutes = require('./app/routes').router;
const initMongo = require('./config/mongo');
const cookieParser = require('cookie-parser');

const port = process.env.PORT || 8080;

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(morgan('combined'));

const allowedOrigins = ['http://localhost:3000',
  'http://localhost:8080', 'http://www.parkingmanagerapp.com'];

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin
    // (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not ' +
                'allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
}));

initMongo.connect()
    .then(() => {
      app.use(appRoutes);

      app.listen(port, () => {
        console.log(`Listening on ${port}`);
      });
    })
    .catch((err) => {
      console.log(`Error intializing server. ERROR: ${err}`);
    });

module.exports = {
  app,
};

