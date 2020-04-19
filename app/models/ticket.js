const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

const ticketSchema = new Schema({
  _userId: {type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User'},
  date: {type: mongoose.Schema.Types.Date, required: true},
  violationType: {type: String, enum: ['Expired Tag', 'No Tag', 'Improper Parking']},
  licensePlate: {type: String},
  description: {type: String},
  location: {type: String, enum: ['Garage A', 'Garage B', 'Garage C']},
  additionalComments: {type: String},
  lastModified: {type: Date, default: Date.now},
  status: {type: String, enum: ['Rejected', 'Submitted', 'Completed'], default: 'Submitted'},
  image: {type: Buffer},
});

ticketSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Ticket', ticketSchema);
