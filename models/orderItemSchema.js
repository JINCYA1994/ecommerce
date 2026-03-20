const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderItemSchema = new Schema({

  order_id: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },

  var_id: {
    type: Schema.Types.ObjectId,
  
    required: true
  },
  status: {
    type: String,
    enum: ["Processing", "Shipped", "Delivered", "Cancelled","Returned"],
    default: "Processing"
  },
size:{type:Number,required:true},

  quantity: {
    type: Number,
    required: true
  },

  price: {
    type: Number,
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model('OrderItem', orderItemSchema);