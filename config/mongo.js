const mongoose = require('mongoose');

const mongoEndpoint = process.env.MONGO_ENDPOINT;

const connect = () => {
  console.log(`Connecting to MongoDB database: ${mongoEndpoint}`);
  return mongoose
      .connect(mongoEndpoint, {useNewUrlParser: true, useUnifiedTopology: true})
      .then(() => {
        console.log('MongoDB connection succesful.');
      })
      .catch((err) => {
        console.log(`MongoDB connection unsuccesful. ERROR: ${err}`);
      });
};

module.exports = {
  connect,
};
