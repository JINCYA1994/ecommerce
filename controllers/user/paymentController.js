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
const Wallet = require('../../models/walletSchema');
const { getActiveOffers, getFinalPrice } = require('../../helpers/offerTotal');
const createOrderItems =require('../../helpers/createOrderItems');
const razorpay = new Razorpay({

  key_id: process.env.RAZORPAY_KEY_ID,

  key_secret: process.env.RAZORPAY_KEY_SECRET

});


const createRetryPayment = async (req, res) => {

  try {

    const { orderId } = req.body;

    const order = await Order.findOne({
      orderId
    }).populate("payment_id");

    if (!order) {

      return res.json({
        success: false
      });

    }

    const options = {

      amount: order.total_price * 100,

      currency: "INR",

      receipt: "retry_" + Date.now()

    };

    const razorpayOrder =
      await razorpay.orders.create(options);

    res.json({

      success: true,

      keyId: process.env.RAZORPAY_KEY_ID,

      razorpayOrderId: razorpayOrder.id,

      amount: order.total_price * 100

    });

  } catch (error) {

    console.log(error);

    res.json({
      success: false
    });

  }

};

const updatePaymentFailed = async (req, res) => {

  try {

    const { orderId } = req.body;

    const order = await Order.findOne({ orderId });

    if (!order) {

      return res.json({
        success: false
      });

    }

    order.status = "Payment Failed";

    await order.save();

    await Payment.findByIdAndUpdate(
      order.payment_id,
      {
        status: "Failed"
      }
    );

    res.json({
      success: true
    });

  } catch (error) {

    console.log(error);

    res.json({
      success: false
    });

  }

};





const placeOrderWallet = async (req, res) => {

  try {

    const userId = req.session.user;

 const { addressId } = req.query;

    if (!userId) {
      return res.redirect("/login");
    }

    // CART
    const cart = await Cart.findOne({ user_id: userId}).populate("items.product_id");

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }

 const address = await Address.findOne({ _id: addressId, userId: userId });

    if (!address) {
 return res.redirect("/checkout");
 }
    // WALLET
    let wallet = await Wallet.findOne({ userId: userId });

    if (!wallet) {

      wallet = await Wallet.create({
        userId: userId,
        balance: 0
      });

    }
    // TOTAL
    const couponDiscount = req.session.coupon?.discount || 0;

    const { finalAmount, subtotal, shipping, taxes, offerDiscount, totalDiscount } = await calculateCartTotal(cart, couponDiscount);
    const offers = await getActiveOffers();


    for (let item of cart.items) {

      const product = await Product.findById(item.product_id._id);

      const variant = product?.variants.id(item.var_id);

      const sizeObj = variant?.sizes.find(s => s.size === item.size);

      if (

        !product ||

        !product.isListed ||

        product.isDeleted ||

        !variant ||

        !sizeObj ||

        !sizeObj.isListed ||

        sizeObj.isDeleted ||

        sizeObj.stock < item.quantity

      ) {
        req.session.checkoutError = "Some products are unavailable";

        return res.redirect("/checkout");
      }

    }
    // CHECK BALANCE
    if (wallet.balance < finalAmount) {

      req.session.checkoutError = "Insufficient wallet balance";

      return res.redirect("/checkout");
    }

    let couponId = null;
 if (req.session.coupon) {

      const coupon = await Coupon.findOne({ code: req.session.coupon.code });

      if (coupon) {
          couponId = coupon._id;
        if (coupon.usedCount >= coupon.usageLimit) {

          req.session.checkoutError = "Coupon usage limit exceeded";

          return res.redirect("/checkout");

        }


        const alreadyUsed = coupon.usedBy.some(id => id.toString() === userId.toString());

        if (!alreadyUsed) {

          coupon.usedCount += 1;
          coupon.usedBy.push(userId);
          await coupon.save();
        }
      }
    }

    // PAYMENT CREATE
    const payment = await Payment.create({
      user_id: userId,

      amount: finalAmount,

      payment_method: "WALLET",

      status: "Success",

      paid_at: new Date()

    });

    // ORDER ID
    const generateOrderID = () => {
      return "ORD" +
        Math.floor(100000 + Math.random() * 900000);
    };

    // ORDER CREATE
    const newOrder = await Order.create({

      user_id: userId,

      orderId: generateOrderID(),

      addresses_id: address._id,

      total_price: finalAmount,

      payment_id: payment._id,

      payment_method: "WALLET",

      status: "Processing",

      subtotal,

      shipping,

      taxes,
      coupons_id: couponId,
      coupon_discount: couponDiscount,

      offer_discount: offerDiscount,

      total_discount: totalDiscount,

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

   


await createOrderItems(

  newOrder,

  cart,

  subtotal,

  couponDiscount,

  taxes,

  offers

);

    
    // WALLET DEDUCT
    wallet.balance -= finalAmount;

    // WALLET HISTORY
    wallet.transactions.push({

      amount: finalAmount,

      type: "debit",

      description:
        "Order Payment - " + newOrder.orderId,

      date: new Date()

    });

    await wallet.save();

    // CLEAR CART
    cart.items = [];

    await cart.save();

    // REMOVE COUPON
    req.session.coupon = null;

    // SUCCESS
    res.redirect(
      "/order-success/" + newOrder.orderId
    );

  } catch (error) {

    console.log("Wallet Order Error:", error);

    res.redirect("/checkout");

  }

};





module.exports = { createRetryPayment, updatePaymentFailed, placeOrderWallet }