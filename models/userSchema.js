const mongoose=require('mongoose')

const userSchema=new mongoose.Schema({
  username:{
    type:String,
    required:true,
    unique:true,
    trim:true,
    minlength:3,
    maxlength:30
},
email:{
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true,
},

 password: {
    type:String,
    required: false,
 },
 firstname:{
  type:String,
  trim:true,
 
 },
 lastname:{
    type:String,
    trim:true,
  
 }, 
 referralCode:{
    type:String,
    unique:true
  },
  referredBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
}, 
 googleId:{
  type:String,
  unique:true,
   sparse: true 
},

    role:{
      type:String,
      enum:['admin','user'], 
      default:'user'
    }, 

     profileImage: {
    type: String,
   
  },
    isBlocked: {
      type: Boolean,
      default: false,
    },
  isVerified: { type: Boolean, default: false }} ,{
  timestamps: true
});






module.exports=mongoose.model('User',userSchema)