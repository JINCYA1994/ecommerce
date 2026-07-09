

const mongoose = require('mongoose');
const { Schema } = mongoose;


const sizeSchema = new Schema({
  size: { type: Number }, 
  stock: { type: Number} ,  
  maxOrderQty: {
  type: Number,
  default: 10
},
  isListed: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false}
});


const variantSchema = new Schema({

  color: { type: String },
  price: { type: Number  },
  // discount_price: { type: Number },             
  images: [{ type: String }],                   
  sizes: [sizeSchema]  ,  
                        
})


const productSchema = new Schema({
  category_id: { type: Schema.Types.ObjectId, ref: 'Category' },
  product_name: { type: String },
  product_description: { type: String },
   isListed: { type: Boolean, default: true },
   isDeleted: { type: Boolean, default: false },
  variants: [variantSchema]                      
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Product', productSchema);
