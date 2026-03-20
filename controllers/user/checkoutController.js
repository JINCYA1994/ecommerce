const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Address=require('../../models/addressSchema')


const viewcheckoutPage = async (req, res) => {
  try {
 const userData = req.session.user || null;
    const userId = req.session.user._id;

    const addresses = await Address.find({ userId });

    const cart = await Cart.findOne({ user_id: userId })
      .populate("items.product_id");

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }
let subtotal = 0;
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
cart.items.forEach(item => {

  const variant = item.product_id.variants.find(v =>
    v._id.equals(item.var_id)
  );

  const originalPrice = Number(variant?.price || 0);
  const discountPrice = Number(variant?.discount_price || 0);

  const sellingPrice =
  discountPrice && discountPrice < originalPrice
    ? discountPrice
    : originalPrice;

  subtotal += sellingPrice * item.quantity;
});
  
    const shipping = 50;
    const discount = 0;
    const finalAmount = subtotal + shipping - discount;

    res.render("checkout", {
      addresses,
      cart,
      subtotal,
      shipping,
      discount,
      finalAmount,states,messageUpdated,messageAdded,userData
    });

  } catch (error) {
    console.log(error);
  }
};




module.exports={viewcheckoutPage}