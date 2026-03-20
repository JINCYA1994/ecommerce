const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const { isValidPincode, isValidMobile,isValidName } = require('../../utils/validator');
const getaddresspage=async (req,res) => {
    try {
      
   const states = [
      "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
      "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand",
      "Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
      "Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
      "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
      "Uttar Pradesh","Uttarakhand","West Bengal",
      "Andaman and Nicobar Islands","Chandigarh",
      "Dadra and Nagar Haveli and Daman and Diu",
      "Delhi","Jammu and Kashmir","Ladakh",
      "Lakshadweep","Puducherry"
    ];
const messageAdded = req.session.addressAdded;
const messageUpdated = req.session.addressUpdated;


req.session.addressAdded = null;
req.session.addressUpdated = null;   

const userId = req.session.user;
    const userData=await User.findById(userId)
    const addresses = await Address.find({ userId });

    res.render("address", {addresses,userData,states,messageAdded,messageUpdated});
    } catch (error) {
       console.log(error);
    res.redirect('/pageNotFound');
    }
}


const saveAddress=async(req,res)=>{
try {
  
   const {name,house_name,locality,city,state,pincode,mobilenumber,addressId,redirectTo} =req.body
 if (!name || !house_name || !locality || !city || !state || !pincode || !mobilenumber) {
        return res.status(400).json({ message: "All fields are required" })
 
 }
if(!isValidName(name)){
  return res.status(400).json({message:'Invalid name format'})
}
if (!isValidPincode(pincode)){
  return res.status(400).json({message:'Invalid pincode'})
}
if(!isValidMobile(mobilenumber)){
  return res.status(400).json({message:'Invalid mobile number'})
}
if (addressId) {

      await Address.findOneAndUpdate(
        { _id: addressId, userId: req.session.user },{
          name,
          house_name,
          locality,
          city,
          state,
          pincode,
          mobilenumber
        }
      )
     req.session.addressUpdated = true;
      console.log("Address Updated Successfully");

    }else{
const addressCount=await Address.countDocuments({userId:req.session.user})
const newAddress=new Address({
  userId:req.session.user,
  addressId,
      name,
      house_name,
      locality,
      city,
      state,
      pincode,
      mobilenumber,
      is_default:addressCount===0
})
await newAddress.save()

 req.session.addressAdded=true
 console.log("New Address Added Successfully");

    }
res.redirect(redirectTo ||'/address')

} catch (error) {
   console.log(error);
    res.redirect("/pageNotFound");
}
}

const deleteAddress=async (req,res) => {
  try {
   const addressId=req.params.id

const address = await Address.findOne({_id: addressId, userId: req.session.user});

  if (!address) {
      return res.json({ success: false })
    }

   const wasDefault = address.is_default;


    await Address.deleteOne({ _id: addressId,userId: req.session.user});


    if (wasDefault) {

      const nextAddress = await Address.findOne({userId: req.session.user });

      if (nextAddress) {
        nextAddress.is_default = true;
        await nextAddress.save();
      }
    }

   res.json({ success: true });


  } catch (error) {
      console.log(error);
     res.json({ success: false });
  }
  
}




module.exports={getaddresspage,saveAddress,deleteAddress}