const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderSchema = new Schema({

  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
    orderId: {
    type: String,
    required: true,
    unique: true
  },


  addresses_id: {
    type: Schema.Types.ObjectId,
    ref: 'Address',
    required: true
  },
subtotal: {
  type: Number,
  default: 0
},
shipping: {
  type: Number,
  default: 0
},

taxes: {
  type: Number,
  default: 0
},

coupon_discount: {
  type: Number,
  default: 0
},

offer_discount: {
  type: Number,
  default: 0
},

total_discount: {
  type: Number,
  default: 0
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
    ref: 'Payment',
     default: null
  },

  status: {
    type: String,
    enum: ["Processing", "Shipped", "Delivered", "Cancelled","Returned", "Partially Returned","Partially Delivered","Payment Failed"],
    default: "Processing"
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