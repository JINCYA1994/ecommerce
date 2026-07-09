const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema')
const Coupon = require('../../models/couponSchema');
const calculateCartTotal = require('../../helpers/calculateTotal');
const { getFinalPrice } = require('../../helpers/offerTotal');
const Offer = require('../../models/offerSchema');



const viewcheckoutPage = async (req, res) => {
  try {
    const userData = req.session.user || null;
    const userId = req.session.user?._id;
    const checkoutError = req.session.checkoutError;
    const cartError = req.session.cartError
    req.session.cartError = null
    req.session.checkoutError = null;

    if (!userId) return res.redirect('/login');

    //  Fetch address
    const addresses = await Address.find({ userId });

    //  Fetch cart
    const cart = await Cart.findOne({ user_id: userId })
      .populate("items.product_id");

    const removeUnavailable =
      req.query.removeUnavailable === 'true';

    const coupons = await Coupon.find({
      isActive: true,
      end_date: { $gt: new Date() }
    });
    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }
    if (removeUnavailable) {

      const removeIds = [];

      for (let item of cart.items) {

        const product = item.product_id;

        const variant =
          product?.variants.id(item.var_id);

        const selectedSize =
          variant?.sizes.find(
            s => s.size == item.size
          );

        const isUnavailable =

          !product ||

          !product.isListed ||

          product.isDeleted ||

          !variant ||

          !selectedSize ||

          !selectedSize.isListed ||

          selectedSize.isDeleted ||

          selectedSize.stock === 0;

        if (isUnavailable) {

          removeIds.push(item._id);

        }

      }

      if (removeIds.length) {

        await Cart.updateOne(

          { _id: cart._id },

          {
            $pull: {
              items: {
                _id: { $in: removeIds }
              }
            }
          }

        );

      }

      return res.redirect('/checkout');

    }
    let errorMessage = "";
    for (let item of cart.items) {
      const product = item.product_id;

      //  Product invalid / unlisted
      if (!product || !product.isListed || product.isDeleted) {
        errorMessage = `${product.product_name} is unavailable and has been removed from your cart.`;

        break;
      }

      const variant = product.variants.id(item.var_id);

      //  Variant invalid
      if (!variant) {
        errorMessage = `${product.product_name} variant is unavailable.`;
        break;
      }

      const selectedSize = variant.sizes.find(s => s.size == item.size);

      //  Size invalid / stock zero
      if (!selectedSize || selectedSize.stock === 0) {
        errorMessage =
          `${product.product_name} size is unavailable.`;
        break;
      }
      if (!selectedSize || !selectedSize.isListed || selectedSize.isDeleted) {
        errorMessage =
          `${product.product_name} size is unavailable.`;
        break;
      }
      //  Quantity > stock
      if (item.quantity > selectedSize.stock) {
        errorMessage =
          `${product.product_name} stock has changed.`;
        break;
      }

      //  Max order limit
      if (item.quantity > selectedSize.maxOrderQty) {
        errorMessage =
          `${product.product_name} exceeds the maximum order limit.`;
        break;
      }
    }


    if (errorMessage) {

      req.session.cartError = errorMessage;

      return res.redirect('/cart?showUnavailable=true');

    }
    if (!req.query.couponApplied) {
      req.session.coupon = null;
    }
    console.log(req.session.coupon);
    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).lean();


    for (const item of cart.items) {

      const product = item.product_id;

      const variant = product.variants.id(item.var_id);

      if (!variant) continue;

      const { finalPrice, discount } = await getFinalPrice(product, variant, offers);

      item.finalPrice = finalPrice;
      item.offerDiscount = discount;
    }


    const discount =
      req.session.coupon?.discount || 0;

    const {
      subtotal,
      shipping,
      taxes,
      finalAmount
    } = await calculateCartTotal(cart, discount);



    // 🔹 States list
    const states = [
      "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
      "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
      "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
      "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
      "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
      "Uttar Pradesh", "Uttarakhand", "West Bengal",
      "Andaman and Nicobar Islands", "Chandigarh",
      "Dadra and Nagar Haveli and Daman and Diu",
      "Delhi", "Jammu and Kashmir", "Ladakh",
      "Lakshadweep", "Puducherry"
    ];

    //  Messages
    const messageAdded = req.session.addressAdded;
    const messageUpdated = req.session.addressUpdated;

    req.session.addressAdded = null;
    req.session.addressUpdated = null;

    // Render checkout
    res.render("checkout", {
      addresses,
      cart,
      subtotal,
      shipping,
      taxes,
      discount,
      finalAmount,
      states,
      messageUpdated,
      messageAdded,
      userData, coupons, checkoutError, cartError
    });

  } catch (error) {
    console.log("Checkout error:", error);
    res.redirect('/cart');
  }
};

const applyCoupon = async (req, res) => {

  try {
    const userData = req.session.user || null;
    const userId = req.session.user?._id;

    if (!userId) return res.redirect('/login');
    const { code } = req.body;

    const cart = await Cart.findOne({ user_id: userId })
      .populate("items.product_id");

    if (!cart) {
      return res.json({
        success: false,
        message: "Cart not found"
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) {
      return res.json({ success: false, message: "Invalid coupon" });
    }
    if (coupon.end_date < new Date()) {

      return res.json({ success: false, message: "Coupon expired" });

    }
    if (coupon.start_date > new Date()) {

      return res.json({ success: false, message: "Coupon not started" });

    }
    const alreadyUsed = coupon.usedBy.some(id => id.toString() === userId.toString());

    if (alreadyUsed) {
      return res.json({ success: false, message: "You have already used this coupon" });

    }
    if (coupon.usedCount >= coupon.usageLimit) {

      return res.json({ success: false, message: "Coupon usage limit exceeded" });

    }

    const { subtotal } = await calculateCartTotal(cart);

    if (subtotal < coupon.min_purchase) {
      return res.json({
        success: false,
        message: "Minimum purchase not met"
      });
    }

    let discount = 0;

    if (coupon.discount_type === "flat") {
      discount = coupon.discount_value;
      discount = Math.min(discount,subtotal);
    }

    if (coupon.discount_type === "percentage") {
      discount = (subtotal * coupon.discount_value) / 100;

      if (coupon.max_discount) {
        discount = Math.min(discount, coupon.max_discount);
      }
    }

    req.session.coupon = {
      code: coupon.code,
      discount
    };

    const {
      shipping,
      taxes,
      finalAmount
    } = await calculateCartTotal(cart, discount);


    res.json({
      success: true,
      discount,
      finalAmount
    });

  } catch (err) {
    console.log(err);

    res.json({
      success: false,
      message: "Something went wrong"
    });
  }
};

const removeCoupon = async (req, res) => {

  try {

    const userId = req.session.user._id;

    const cart = await Cart.findOne({ user_id: userId })
      .populate("items.product_id");


    req.session.coupon = null;


    const {
      finalAmount
    } = await calculateCartTotal(cart);

    res.json({
      success: true,
      finalAmount
    });

  } catch (err) {

    console.log(err);

    res.json({
      success: false
    });
  }
};




module.exports = { viewcheckoutPage, applyCoupon, removeCoupon }