const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderSchema = new Schema({

  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  addresses_id: {
    type: Schema.Types.ObjectId,
    ref: 'Address',
    required: true
  },

  total_price: {
    type: Number,
    required: true
  },

  ordered_at: {
    type: Date,
    default: Date.now
  },

  coupons_id: {
    type: Schema.Types.ObjectId,
    ref: 'Coupon'
  },

  payment_id: {
    type: Schema.Types.ObjectId,
    ref: 'Payment'
  },

  status: {
    type: String,
    enum: ["pending", "On Delivery", "Delivered", "Cancelled"],
    default: "pending"
  },

  delivery_address: {
    name: { type: String, required: true },
    house_name: { type: String, required: true },
    locality: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    
    mobilenumber: { type: Number, required: true },
    pincode: { type: String, required: true }
  }

}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);