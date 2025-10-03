const mongoose = require("mongoose");
const categorySchema=new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,  
    trim: true
  },
  description: {
    type: String,
    default: ""
  },
  

  isDeleted: {
  type: Boolean,
  default: false
},
  isListed: {
    type: Boolean,
    default: true   
  }},{
  timestamps: true}
);


module.exports = mongoose.model("Category",categorySchema);