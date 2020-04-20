const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

const ticketSchema = new Schema({
  _userId: {type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User'},
  violation_type: {type: String, enum: ['Expired Tag', 'No Tag', 'Improper Parking']},
  license_plate: {type: String},
  description: {type: String},
  location: {type: String, enum: ['Garage A', 'Garage B', 'Garage C']},
  additional_comments: {type: String},
  status: {type: String, enum: ['Rejected', 'Submitted', 'Completed'], default: 'Submitted'},
  image: {data: String, content_type: String},
  ticketor_name: {type: String},
}, {timestamps: {createdAt: 'createdAt', updatedAt: 'updatedAt'}});

ticketSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Ticket', ticketSchema);
