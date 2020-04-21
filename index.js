require('./config/env');

const cors = require('cors');
const morgan = require('morgan');
const express = require('express');
const appRoutes = require('./app/routes').router;
const initMongo = require('./config/mongo');
const cookieParser = require('cookie-parser');

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const port = process.env.PORT || 8080;

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(morgan('combined'));
app.use(cors());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

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

