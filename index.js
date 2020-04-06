require('./config/env');

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const initMongo = require('./config/mongo');

const port = process.env.PORT | 3000;

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

initMongo()
    .then(() => {
      app.use(require('./app/routes'));

      app.listen(port, () => {
        console.log(`Listening on ${port}`);
      });
    })
    .catch((err) => {
      console.log(`Error intializing server. ERROR: ${err}`);
    });

module.exports = app;
