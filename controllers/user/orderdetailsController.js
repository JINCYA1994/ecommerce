const Order = require('../../models/orderSchema');
const OrderItem = require('../../models/orderItemSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema')
const Wallet = require('../../models/walletSchema');
const Payment = require('../../models/paymentSchema')
const Coupon = require('../../models/couponSchema')
const calculateCartTotal = require('../../helpers/calculateTotal');
const { getFinalPrice } = require('../../helpers/offerTotal');
const createOrderItems =require('../../helpers/createOrderItems');
const calculateOrderTotal =require('../../helpers/calculateOrderTotal');
const listorderDetails = async (req, res) => {
  try {
    const userId = req.session.user;
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    let filter = { user_id: userId };

    if (search) {
      filter.orderId = { $regex: search, $options: "i" };
    }

    const totalOrders = await Order.countDocuments(filter);
    const userData = await User.findById(userId);

    let orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Populate products for each order
    orders = await Promise.all(orders.map(async (order) => {
      const orderItemsRaw = await OrderItem.find({ order_id: order._id });

      const products = await Promise.all(orderItemsRaw.map(async (item) => {
        const product = await Product.findOne({ 'variants._id': item.var_id });
        if (!product) return null;

        const variant = product.variants.id(item.var_id);

        return {
          _id: item._id,
          name: product.product_name,
          size: item.size,
          color: variant.color,
          price: item.price,
          quantity: item.quantity,
          image: variant.images[0],

          status: item.status
        };
      }));

      // Add products array to order object
      return {
        ...order._doc, // spread original order fields
        products: products.filter(Boolean) // remove nulls
      };
    }));

    const totalPages = Math.ceil(totalOrders / limit);
    const orderMessage = req.session.orderMessage;
    req.session.orderMessage = null;
    res.render("order", {
      orders,
      currentPage: page,
      totalPages,
      search,
      userData, orderMessage
    });

  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
};



const orderDetails = async (req, res) => {
  try {
    const userData = req.session.user || null;
    const orderID = req.params.orderID;
    const order = await Order.findOne({ orderId: orderID });
    if (!order) return res.redirect('/orders');

    // Get all items of this order
    const orderItemsRaw = await OrderItem.find({ order_id: order._id });

    // Populate product and variant details
    const orderItems = await Promise.all(orderItemsRaw.map(async (item) => {
      const product = await Product.findOne({ 'variants._id': item.var_id });
      if (!product) return null;

      const variant = product.variants.id(item.var_id);

      return {
        _id: item._id,
        product_name: product.product_name,
        color: variant.color,
        price: item.price,
        quantity: item.quantity,
        image: variant.images[0], status: item.status
      };
    }));

    res.render('orderDetails', { order, userData, orderItems: orderItems.filter(Boolean) });

  } catch (error) {
    console.log("Order Details Error:", error);
    res.redirect('/orders');
  }
};


const cancelOrder = async (req, res) => {
  try {
    const { orderId, reason, description } = req.body;


    const order = await Order.findById(orderId);
    if (!order) return res.redirect('/orders');

    if (order.status !== 'Processing') {
      return res.redirect('/orders');
    }

    order.status = 'Cancelled';
    order.cancel_reason = reason;
    order.cancel_description = description || '';
  
    console.log(order)

 const payment = await Payment.findById(
      order.payment_id
    );

    //refund
    const wallet = await Wallet.findOne({userId: order.user_id });


    const shouldRefund = payment?.status === "Success" ||

      order.payment_method === "WALLET";

     const refundAmount =order.total_price 
    

   if (shouldRefund && !wallet) {

  req.session.orderMessage = "Wallet not found";

  return res.redirect("/orders");

}
   

    
     if (shouldRefund) {

      wallet.balance += refundAmount;

      wallet.transactions.push({

        type: "credit",

        amount:  refundAmount,

        description: `Refund for ${order.orderId}`

      });

      await wallet.save();

    }

    const orderItems = await OrderItem.find({ order_id: order._id });



    for (let item of orderItems) {

      item.status = "Cancelled";

      item.cancelReason = reason;

      item.cancelDescription = description || "";

      await item.save();

      const product = await Product.findOne({
        'variants._id': item.var_id
      });

      if (!product) continue;

      const variant = product.variants.id(item.var_id);

      const size = variant.sizes.find(
        s => s.size === item.size
      );

      if (size) {

        size.stock += item.quantity;

        await product.save();

      }

    }
   order.subtotal = 0;

order.shipping = 0;

order.taxes = 0;

order.coupon_discount = 0;

order.total_discount = 0;

order.total_price = 0;

await order.save();
    req.session.orderMessage = "Order Cancelled";
    res.redirect('/orders');

  } catch (error) {
    console.log("Cancel Order Error:", error);
    res.redirect('/orders');
  }
};


const returnProduct = async (req, res) => {
  try {
    const { productId, reason, description } = req.body;

    const orderItem = await OrderItem.findById(productId);

    if (!orderItem) return res.redirect('/orders');
    if (orderItem.status === "Return Requested") {

      req.session.orderMessage = "Return already requested";

      return res.redirect("/orders");

    }
    if (orderItem.status !== "Delivered") {
      return res.redirect('/orders');
    }

    orderItem.status = "Return Requested";
    orderItem.returnReason = reason;
    orderItem.returnDescription = description;

    await orderItem.save();






    req.session.orderMessage = "Return Requested";
    // req.session.orderMessage = null;
    res.redirect('/orders');

  } catch (error) {
    console.log(error);
    res.redirect('/orders');
  }
};



// const cancelProduct = async (req, res) => {
//   try {
//     const { orderId, productId, reason, description } = req.body;

//     const orderItem = await OrderItem.findById(productId);
//     if (!orderItem) return res.redirect('/orders');

//     // already cancelled check
//     if (orderItem.status === "Cancelled") {
//       req.session.orderMessage = "Already Cancelled";
//       return res.redirect('/orders');
//     }

//     // update status
//     orderItem.status = "Cancelled";
//     orderItem.cancelReason = reason;
//     orderItem.cancelDescription = description;
//     await orderItem.save();

//     const order = await Order.findById(orderItem.order_id);
    
//     //refund

//     const wallet = await Wallet.findOne({userId: req.session.user});
//     if (!wallet) {

//       return res.redirect("/orders");

//     }

//     const activeItems = await OrderItem.find({

//          order_id: order._id,

//       _id: { $ne: orderItem._id },

//       status: { $ne: "Cancelled" }

//     });


//     let remainingSubtotal = 0;

//     for (let item of activeItems) {

//      remainingSubtotal += item.price * item.quantity;
// }

   

//     if (remainingSubtotal > 0) {

//    remainingTaxes = Math.round( remainingSubtotal * 0.03);

// }

//     let coupon = null;

//     if (order.coupon_discount > 0 && order.coupons_id) {

//       coupon = await Coupon.findById(order.coupons_id);

//     }
//     let couponRemoved = false;

//     if (coupon && remainingSubtotal < coupon.min_purchase) {

//       couponRemoved = true;

//     }
//     if (couponRemoved) {

//     refundAmount =orderItem.final_amount + order.coupon_discount;
//     order.coupon_discount = 0; 
//     order.total_discount = order.offer_discount;
//     order.coupons_id = null;
//     }

// let refundAmount = orderItem.final_amount;
 
//     const payment = await Payment.findById(order.payment_id);

//     const shouldRefund = payment?.status === "Success" || order.payment_method === "WALLET";

//     if (shouldRefund) {

//       wallet.balance += refundAmount;

//       wallet.transactions.push({

//         type: "credit",

//         amount: refundAmount,

//         description: `Refund for ${order.orderId}`

//       });

//       await wallet.save();

//     }


//     // STOCK RESTORE (VERY IMPORTANT)
//     const product = await Product.findOne({ 'variants._id': orderItem.var_id });

//     if (product) {
//       const variant = product.variants.id(orderItem.var_id);

//       if (variant) {
//         const sizeObj = variant.sizes.find(s => s.size === orderItem.size);

//         if (sizeObj) {
//           sizeObj.stock += orderItem.quantity;
//           await product.save();
//         }
//       }
//     }


//     const remaining = await OrderItem.find({
//       order_id: orderItem.order_id,
//       status: { $ne: "Cancelled" }
//     });
//     if (remaining.length > 0) {

//       order.subtotal = remainingSubtotal;
//       order.taxes = remainingTaxes;
//       order.total_price =order.subtotal  +order.shipping +order.taxes -  order.coupon_discount;

//       await order.save();

//     }
//     if (remaining.length === 0) {

//       order.status = "Cancelled";

//       order.subtotal = 0;

//       order.shipping = 0;

//       order.taxes = 0;

//       order.coupon_discount = 0;

//       order.total_discount = 0;

//       order.total_price = 0;

//       await order.save();

//     }
//     req.session.orderMessage = "Product Cancelled Successfully";
//     return res.redirect('/orders');

//   } catch (error) {
//     console.log(error);
//     res.redirect('/orders');
//   }
// }
const cancelProduct = async (req, res) => {

  try {

    const { productId, reason, description } = req.body;

    const orderItem = await OrderItem.findById(productId);

    if (!orderItem) {

      return res.redirect("/orders");

    }

    if (orderItem.status === "Cancelled") {

      req.session.orderMessage ="Already Cancelled";

      return res.redirect("/orders");

    }

    // update item status

    orderItem.status = "Cancelled";

    orderItem.cancelReason = reason;

    orderItem.cancelDescription = description;

    await orderItem.save();



    const order = await Order.findById(

      orderItem.order_id

    );



    // calculate new totals

    const totals = await calculateOrderTotal(

      order,

      orderItem._id

    );



    // refund amount

    let refundAmount =orderItem.final_amount;



    // coupon validation

    // if (

    //   order.coupon_discount > 0 &&

    //   order.coupons_id &&

    //   totals.couponDiscount === 0

    // ) {

    //   refundAmount +=order.coupon_discount;

    // }
const shippingDifference =
  totals.shipping - order.shipping;

if (shippingDifference > 0) {
  refundAmount -= shippingDifference;
}
if (totals.items.length === 0) {

  refundAmount += order.shipping;

}
orderItem.refund_amount = refundAmount;
await orderItem.save();
    // payment

    const payment = await Payment.findById(

      order.payment_id

    );



    const shouldRefund =  payment?.status === "Success" || order.payment_method === "WALLET";

    if (shouldRefund) { const wallet = await Wallet.findOne({ userId: req.session.user});

     if (wallet) { wallet.balance += refundAmount;

       wallet.transactions.push({

          type: "credit",

          amount: refundAmount,

          description:

          `Refund for ${order.orderId}`,

          date: new Date()

        });



        await wallet.save();
        console.log({ refundAmount, walletBalance: wallet.balance });
      }

    }



    // restore stock

    const product = await Product.findOne({

      "variants._id":

      orderItem.var_id

    });



    if (product) {

      const variant = product.variants.id(orderItem.var_id );
      const sizeObj = variant.sizes.find( s => s.size === orderItem.size);
      if (sizeObj) {

        sizeObj.stock += orderItem.quantity;

      }

await product.save();

    }

 // all products cancelled ?

  if (totals.items.length === 0) {

  order.status = "Cancelled";

}
 else {

    order.status = "Processing";

}

 // update order totals

    order.subtotal = totals.subtotal;
    order.shipping = totals.shipping;
    order.taxes = totals.taxes;
    order.coupon_discount = totals.couponDiscount;
    order.total_price = totals.total;
// if (

    //   totals.couponDiscount === 0

    // ) {

    //   order.coupons_id = null;
    //   order.total_discount =order.offer_discount;

    // }

order.total_discount = order.offer_discount + totals.couponDiscount;

if (totals.couponDiscount === 0) {
    order.coupons_id = null;
}

await order.save();

console.log({

subtotal: totals.subtotal,

shipping: totals.shipping,

taxes: totals.taxes,

couponDiscount: totals.couponDiscount,

total: totals.total

});
console.log(orderItem);

console.log(totals);

console.log({
    refundAmount,
    shippingDifference
});
req.session.orderMessage = "Product Cancelled Successfully";
return res.redirect("/orders");



  }

  catch (error) {

    console.log(error);

    return res.redirect("/orders");

  }

};


const invoicePage = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    if (!order) return res.redirect('/orders');

    // Get all order items
    const orderItemsRaw = await OrderItem.find({ order_id: order._id });

    const filteredItems = orderItemsRaw.filter(
      item => item.status !== "Cancelled"  &&  item.status !== "Returned"
    );

    // Populate product details
    const items = await Promise.all(filteredItems.map(async (item) => {
      const product = await Product.findOne({ 'variants._id': item.var_id });
      if (!product) return null;

      const variant = product.variants.id(item.var_id);

      return {
        name: product.product_name,
        quantity: item.quantity,
        price: item.price,
        image: variant?.images?.[0] || '/images/default-product.png'
      };
    }));

    // remove null values
    const cleanItems = items.filter(Boolean);



    // invoice object
    const invoiceData = {
      invoiceNumber: order.orderId,
      date: order.createdAt.toLocaleDateString(),
      customer: order.delivery_address,
      deliveryAddress: order.delivery_address,
      paymentMethod: order.payment_method || "Cash on Delivery",
      status: order.status,
      items: cleanItems,
      taxes: order.taxes,
      subtotal: order.subtotal,
      offerDiscount: order.offer_discount,
      couponDiscount: order.coupon_discount,
      delivery: order.shipping,
      total: order.total_price
    };

    res.render('invoice', { invoice: invoiceData });
    console.log(invoiceData)
  } catch (error) {
    console.log("Invoice Error:", error);
    res.redirect('/orders');
  }
};











module.exports = { listorderDetails, orderDetails, invoicePage, cancelOrder, cancelProduct, returnProduct }