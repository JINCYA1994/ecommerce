const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const Product = require('../../models/productSchema');
const Order = require('../../models/orderSchema');
const Cart = require('../../models/cartSchema');
const OrderItem = require('../../models/orderItemSchema');
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require('../../models/paymentSchema');
const Coupon = require('../../models/couponSchema');
const calculateCartTotal = require('../../helpers/calculateTotal');
const { getActiveOffers, getFinalPrice } = require('../../helpers/offerTotal');
const createOrderItems =require('../../helpers/createOrderItems');


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const placeOrderpage = async (req, res) => {
  try {

    const userId = req.session.user;

    if (!userId) {
      return res.redirect('/login');
    }

    const { selectedAddress } = req.body;
    console.log(selectedAddress)

    const cart = await Cart.findOne({ user_id: userId })
      .populate('items.product_id');

    if (!cart || cart.items.length === 0) {
      return res.redirect('/cart');
    }



    const address = await Address.findOne({ _id: selectedAddress, userId: userId});

    if (!address) {

      return res.json({success: false, message: "Invalid address"});

    }
    const couponDiscount =
      req.session.coupon?.discount || 0;

    const { finalAmount, subtotal, shipping, taxes, offerDiscount, totalDiscount, } = await calculateCartTotal(cart, couponDiscount);

    console.log("FINAL AMOUNT =", finalAmount);


    const generateOrderID = () => {
      return "ORD" + Math.floor(100000 + Math.random() * 900000);
    };

    const payment = await Payment.create({

      user_id: userId,

      amount: finalAmount,

      payment_method: "ONLINE",

      status: "Pending",

    });

    console.log({
      subtotal,
      shipping,
      taxes,
      couponDiscount,
      offerDiscount,
      totalDiscount,
      finalAmount
    });
    for (let item of cart.items) {

      const product =await Product.findById( item.product_id._id);

      const variant =product.variants.id(item.var_id);

      const sizeObj = variant.sizes.find(s => s.size === item.size );

if ( !product ||!product.isListed ||product.isDeleted ||!variant ||!sizeObj ||!sizeObj.isListed ||sizeObj.isDeleted ||sizeObj.stock < item.quantity)

 {

 return res.json({success:false,message:"Some products are unavailable"});

}
    }

let couponId = null;

if (req.session.coupon) {

 const coupon = await Coupon.findOne({code:req.session.coupon.code });

 if(coupon){

   couponId = coupon._id;

 }

}

    const newOrder = await Order.create({
      user_id: userId,
      orderId: generateOrderID(),
      addresses_id: address._id,
      total_price: finalAmount,
      payment_id: payment._id,
      subtotal: subtotal,
      coupon_discount: couponDiscount,
      offer_discount: offerDiscount,
      total_discount: totalDiscount,
      coupons_id: couponId,
      shipping,
      taxes,
      delivery_address: {
        name: address.name,
        house_name: address.house_name,
        locality: address.locality,
        city: address.city,
        state: address.state,
        mobilenumber: address.mobilenumber,
        pincode: address.pincode
      }
    });
    console.log(newOrder)

const offers = await getActiveOffers();

await createOrderItems(

  newOrder,

  cart,

  subtotal,

  couponDiscount,

  taxes,

  offers

);

   
    const options = {
      amount: finalAmount * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now()
    };
    const razorpayOrder = await razorpay.orders.create(options);

    res.json({
      success: true,
      razorpayOrder,
      addressId: selectedAddress,
      orderId: newOrder.orderId
    });

  } catch (error) {
    console.log(error);
    res.json({ success: false });
  }
};



const verifyPayment = async (req, res) => {

  try {

    const userId = req.session.user;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId
    } = req.body;

    // FIND ORDER
    const order = await Order.findOne({
      orderId: orderId,
      user_id: userId
    });

    if (!order) {

      return res.json({
        success: false,
        message: "Order not found"
      });

    }
    const payment =

      await Payment.findById(

        order.payment_id

      );

    if (

      payment.status === "Success"

    ) {

      return res.json({

        success: true,

        orderId: order.orderId

      });

    }
    // VERIFY SIGNATURE
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    // PAYMENT FAILED
    if (generated_signature !== razorpay_signature) {

      await Payment.findByIdAndUpdate(
        order.payment_id,
        {
          status: "Failed"
        }
      );
      order.status = "Payment Failed";

      await order.save();

      return res.json({
        success: false,
        message: "Payment verification failed"
      });

    }

    // PAYMENT SUCCESS
    await Payment.findByIdAndUpdate(
      order.payment_id,
      {
        transaction_id: razorpay_payment_id,
        status: "Success",
        paid_at: new Date()
      }
    );
    order.status = "Processing";
await order.save();

   
    req.session.coupon = null;
    // GET ORDER ITEMS
    const orderItems = await OrderItem.find({
      order_id: order._id
    });


    // REDUCE STOCK
    for (let item of orderItems) {

      const product = await Product.findOne({
        "variants._id": item.var_id
      });

      if (!product) {

        return res.json({
          success: false,
          message: "Product not found"
        });

      }

      const variant = product.variants.id(item.var_id);

      const sizeObj = variant.sizes.find(
        s => s.size === item.size
      );

      if (!sizeObj) {

        return res.json({
          success: false,
          message: "Size not found"
        });

      }

      if (sizeObj.stock < item.quantity) {

        return res.json({
          success: false,
          message: "Out of stock"
        });

      }

      sizeObj.stock -= item.quantity;

      await product.save();

    }


    // CLEAR CART
    const cart = await Cart.findOne({
      user_id: userId
    });

    if (cart) {

      cart.items = [];

      await cart.save();

    }


    // REMOVE COUPON
    req.session.coupon = null;


    // SUCCESS RESPONSE
    res.json({
      success: true,
      orderId: order.orderId
    });
  } catch (error) {

    console.log("Verify Payment Error:", error);

    res.json({
      success: false
    });

  }

}

const placeOrderCOD = async (req, res) => {
  try {
    const userId = req.session.user;
    const { addressId } = req.query;

    if (!userId) return res.redirect('/login');

    const cart = await Cart.findOne({ user_id: userId })
      .populate('items.product_id');

    if (!cart || cart.items.length === 0) {
      return res.redirect('/cart');
    }

    
    const address = await Address.findOne({ _id: addressId, userId: userId });

    if (!address) {

      return res.redirect("/checkout");

    }

    const couponDiscount =req.session.coupon?.discount || 0;

    const { finalAmount, subtotal, shipping, taxes, offerDiscount, totalDiscount, } = await calculateCartTotal(cart, couponDiscount);
    
    if (finalAmount > 1000) {

      req.session.checkoutError = "COD available only below ₹1000";

      return res.redirect('/checkout');

    }

    let couponId = null;
 if (req.session.coupon) {

  const coupon = await Coupon.findOne({ code: req.session.coupon.code});

  if (coupon) {

    couponId = coupon._id;
    if (coupon.usedCount >= coupon.usageLimit) {

      req.session.checkoutError ="Coupon usage limit exceeded";

      return res.redirect("/checkout");

    }

    const alreadyUsed = coupon.usedBy.some( id => id.toString() === userId.toString());

    if (!alreadyUsed) {

      coupon.usedCount += 1;

      coupon.usedBy.push(userId);

      await coupon.save();

    }

  }

}
    const generateOrderID = () => {
      return "ORD" + Math.floor(100000 + Math.random() * 900000);
    };

    const newOrder = await Order.create({
      user_id: userId,
      subtotal,
      shipping,
      taxes,
      coupon_discount: couponDiscount,
      offer_discount: offerDiscount,
      total_discount: totalDiscount,
      coupons_id: couponId,
      orderId: generateOrderID(),
      addresses_id: address._id,
      total_price: finalAmount,
      payment_method: "COD",
      delivery_address: address
    });
 


    const offers = await getActiveOffers();

   await createOrderItems(

  newOrder,

  cart,

  subtotal,

  couponDiscount,

  taxes,

  offers

);
    cart.items = [];

    await cart.save();
   req.session.coupon = null;
     res.redirect(`/order-success/${newOrder.orderId}`);

  } catch (err) {
    console.log(err);
    res.redirect('/checkout');
  }
};





const getOrderSuccessPage = async (req, res) => {
  try {

    const userId = req.session.user;
    const orderId = req.params.id;
    const userData = req.session.user || null;
    const order = await Order.findOne({
      orderId: orderId,
      user_id: userId
    });

    if (!order) {
      return res.redirect('/');
    }

    res.render("orderSuccess", {
      orderId: order.orderId, userData
    });

  } catch (error) {
    res.redirect('/');
  }
};



const getOrderFailurePage = async (req, res) => {

  try {

    const userId = req.session.user;

    const userData = req.session.user || null;

    const errorMessage =
      req.query.error || "Payment Failed";

    const orderId = req.query.orderId;

    let order = null;

    if (orderId) {

      order = await Order.findOne({
        orderId: orderId,
        user_id: userId
      });

    }

    res.render("orderFail", {
      userData,
      errorMessage,
      order
    });

  } catch (error) {

    console.log(error);

    res.redirect("/checkout");

  }

};





module.exports = {
  placeOrderpage, getOrderSuccessPage, verifyPayment, placeOrderCOD, getOrderFailurePage
};





