const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

const ticketSchema = new Schema({
  _userId: {type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User'},
  violationType: {type: String, enum: ['Expired Tag', 'No Tag', 'Improper Parking']},
  licensePlate: {type: String},
  description: {type: String},
  location: {type: String, enum: ['Garage A', 'Garage B', 'Garage C']},
  additionalComments: {type: String},
  status: {type: String, enum: ['Rejected', 'Submitted', 'Completed'], default: 'Submitted'},
  image: {type: Buffer},
}, {timestamps: {createdAt: 'created_at', updatedAt: 'updatedAt'}});

ticketSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Ticket', ticketSchema);
