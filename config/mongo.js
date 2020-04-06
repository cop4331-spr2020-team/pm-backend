const mongoose = require('mongoose');

const DB_URL = process.env.MONGO_ENDPOINT;

module.exports = () => {
    console.log(`Connecting to MongoDB database: ${DB_URL}`)
    return mongoose.connect(DB_URL, {useNewUrlParser: true, useUnifiedTopology: true})
    .then(() => {
        console.log('MongoDB connection succesful.');
    })
    .catch(err => {
        console.log(`MongoDB connection unsuccesful. ERROR: ${err}`);
    });
};