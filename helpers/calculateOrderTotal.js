const OrderItem = require("../models/orderItemSchema");

const Coupon = require("../models/couponSchema");

const calculateOrderTotal = async (

  order,

  excludedItemId = null

) => {

  const items = await OrderItem.find({

    order_id: order._id,

    _id: excludedItemId

      ? { $ne: excludedItemId }

      : { $exists: true },

    status: {

      $nin: [

        "Cancelled",

        "Returned"

      ]

    }

  });

  let subtotal = 0;

  for (let item of items) {

    subtotal +=

      item.price * item.quantity;

  }


  // SHIPPING

  let shipping = 0;

  if (subtotal > 0) {

    shipping =

      subtotal > 2500

      ? 0

      : 50;

  }


  // TAX

  let taxes = 0;

  if (subtotal > 0) {

    taxes = Math.round(

      subtotal * 0.03

    );

  }


  // COUPON

  let couponDiscount =

    order.coupon_discount;


  if (

    order.coupons_id &&

    couponDiscount > 0

  ) {

    const coupon =

      await Coupon.findById(

        order.coupons_id

      );


    if (

      coupon &&

      subtotal <

      coupon.min_purchase

    ) {

      couponDiscount = 0;

    }

  }


  const total =

    Math.max(

      0,

      subtotal +

      shipping +

      taxes -

      couponDiscount

    );


  return {

    items,

    subtotal,

    shipping,

    taxes,

    couponDiscount,

    total

  };

};

module.exports =

calculateOrderTotal;