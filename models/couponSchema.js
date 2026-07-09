const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({

  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true, 
    trim: true
  },

  min_purchase: {
    type: Number,
    required: true
  },

  max_discount: {
    type: Number,
  
  },

  discount_type: {
    type: String,
    enum: ["percentage", "flat"],
    required: true
  },

  discount_value: {
    type: Number,
    required: true
  },
  usageLimit: {
    type: Number,
    default: 1
  },
  usedCount: {
  type: Number,
  default: 0
},
  start_date: {
    type: Date,
    required: true
  },

  end_date: {
    type: Date,
    required: true
  },

  isActive: {
    type: Boolean,
    default: true
  },

  created_At: {
    type: Date,
    default: Date.now
  },
  usedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

});

module.exports = mongoose.model("Coupon", couponSchema);