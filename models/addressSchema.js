const mongoose = require("mongoose");
const addressSchema=new mongoose.Schema({

 userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

name:{
    type:String,
    required:true,
    unique:true,
    trim:true
},
house_name:{
type:String,
required:true,
},
locality:{
type:String,
required:true
},
city:{
type:String,
required:true

},
state:{
type:String,
required:true
},
pincode:{
    type:Number,
    required:true,
},
mobilenumber: {
      type: String,
      trim:true,
    default:"Not given",
    },
is_default:{
    type:Boolean,
     default: false
}},
{timestamps: true}
);


module.exports=mongoose.model('Address',addressSchema)