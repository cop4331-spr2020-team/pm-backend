const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  first_name: {type: String, required: true},
  last_name: {type: String, required: true},
  email: {type: String, required: true, unique: true},
  username: {type: String, required: true, unique: true},
  password: {type: String, required: true},
  verified: {type: Boolean, required: true, default: false},
  reset_token: {type: String},
  verification_token: {type: String},
});

module.exports = mongoose.model('User', userSchema);
