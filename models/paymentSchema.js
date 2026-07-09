const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({

  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  transaction_id: {
    type: String   
  },

  amount: {
    type: Number,
    required: true
  },

  payment_method: {
    type: String,
    enum: ['WALLET', 'Card', 'UPI', 'Netbanking', 'COD','ONLINE'],
    required: true
  },

  status: {
    type: String,
    enum: ['Pending', 'Success', 'Failed'],
    default: 'Pending'
  },

  paid_at: {
    type: Date
  },

  created_at: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Payment", paymentSchema);