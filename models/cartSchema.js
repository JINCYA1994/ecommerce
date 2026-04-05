const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartItemSchema = new Schema({
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },

  var_id: { 
    type: Schema.Types.ObjectId,
    required: true
  },

  size: {     
    type: Number,
    required: true
  },

  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
   

  added_at: {
    type: Date,
    default: Date.now
  }

}, { _id: true });



const cartSchema = new Schema({

  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true  
  },

  items: [cartItemSchema]

}, { 
  timestamps: true 
});


module.exports = mongoose.model('Cart', cartSchema);