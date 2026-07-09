const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderItemSchema = new Schema({

  order_id: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
   product_id:{
        type:Schema.Types.ObjectId,
        ref:"Product",
        required:true
    },
  var_id: {
    type: Schema.Types.ObjectId,
  
    required: true
  },
 status: {
  type: String,
  enum: [
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
    "Return Requested",
    "Returned","Partially Delivered","Return Rejected"
  ],
  default: "Processing"
},
returnReason: String,
returnDescription: String,
cancelReason: String,
cancelDescription: String,



size:{type:Number,required:true},

  quantity: {
    type: Number,
    required: true
  },
coupon_share: {
  type: Number,
  default: 0
},

tax_share: {
  type: Number,
  default: 0
},

final_amount: {
  type: Number,
  default: 0
},
refund_amount: {
    type: Number,
    default: 0
},
  price: {
    type: Number,
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model('OrderItem', orderItemSchema);