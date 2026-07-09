 const User=require('../../models/userSchema')
 const Order=require('../../models/orderSchema')
 const OrderItem=require('../../models/orderItemSchema')
 const Product = require('../../models/productSchema');
 const Wallet = require('../../models/walletSchema');
 const Payment = require('../../models/paymentSchema');
const Coupon = require('../../models/couponSchema')
const calculateOrderTotal =require("../../helpers/calculateOrderTotal");

 const getordersPage=async (req,res)=>{


 try {
     let search = req.query.search || "";
     let page = parseInt(req.query.page) || 1;
     let limit = 5;
     const skip = (page - 1) * limit;
     
     let query = {};
     if (search) {
       query.orderId = { $regex: search, $options: "i" }; 
     }
 
 
     const totalorders = await Order.countDocuments(query);
     const orderMessage = req.session.orderMessage;
      req.session.orderMessage = null;
  
       const orders = await Order.find(query)
      .populate('user_id')
      .sort({ ordered_at: -1 })
      .skip(skip)
      .limit(limit);

 
 
      const totalPages = Math.ceil(totalorders / limit);
 
      res.render('orders', {
       orders,
       search,
       currentPage: page,
       totalPages,
       orderMessage,
       
   success: req.flash('success'),
   error: req.flash('error')
     });
   } catch (err) {
     console.error("Error loading categories:", err);
     res.status(500).send("Server Error");
   }
 };


const allowedStatusUpdate = {
  Processing: ["Shipped", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: ["Returned"],
  Cancelled: [],
 
};

const updateProductStatus = async (req, res) => {
  try{
  const { itemId } = req.params;
  const { status } = req.body;

  const orderItem = await OrderItem.findById( itemId );
  if (!orderItem) return res.redirect("/admin/orders");
const order = await Order.findById(orderItem.order_id);
  const validStatuses = allowedStatusUpdate[orderItem.status];
  if (!validStatuses.includes(status)) {
    
   
    req.session.orderMessage='Cannot change status backward!'
    return res.redirect(`/admin/orders/${order.orderId}`);
  }

  orderItem.status = status
    await orderItem.save()
    await updateOrderStatus(orderItem.order_id)

 if (status === "Cancelled") {

      const product = await Product.findOne({
        'variants._id': orderItem.var_id
      })

      if (product) {

        const variant = product.variants.id(orderItem.var_id)

        const size = variant.sizes.find(
          s => s.size == orderItem.size
        )

        if (size) {
          size.stock += orderItem.quantity
        }

        await product.save()

      }

    }


   
req.session.orderMessage = "Product status updated successfully"

res.redirect(`/admin/orders/${order.orderId}`);

  } catch (error) {

    console.log(error)
    res.redirect("/admin/orders")

  }
}

const updateOrderStatus = async (orderId) => {

  const items = await OrderItem.find({ order_id: orderId });

  //  ORIGINAL STATUSES
  const statuses = items.map(item => item.status);

  //  NORMALIZE (IMPORTANT FIX)
  const normalizeStatus = (status) => {
    if (status === "Return Rejected") return "Delivered";
    return status;
  };

  const normalizedStatuses = statuses.map(normalizeStatus);

  let newStatus = "Processing";

  const allCancelled = normalizedStatuses.every(s => s === "Cancelled");
  const allReturned = normalizedStatuses.every(s => s === "Returned");
  const allDelivered = normalizedStatuses.every(s => s === "Delivered");

  const someReturned = normalizedStatuses.some(s => s === "Returned");
  const someDelivered = normalizedStatuses.some(s => s === "Delivered");
  const someCancelled = normalizedStatuses.some(s => s === "Cancelled");

  //  PRIORITY ORDER IMPORTANT

  if (allCancelled) {
    newStatus = "Cancelled";
  }

  else if (allReturned) {
    newStatus = "Returned";
  }

  else if (someReturned) {
    newStatus = "Partially Returned";
  }

  else if (allDelivered) {
    newStatus = "Delivered";
  }

  else if (someDelivered && someCancelled) {
    newStatus = "Partially Delivered";
  }

  else if (normalizedStatuses.includes("Shipped")) {
    newStatus = "Shipped";
  }

  else {
    newStatus = "Processing";
  }

  await Order.findByIdAndUpdate(orderId, {
    status: newStatus
  });
};




const viewOrderDetails = async (req, res) => {
  try {

  const orderMessage = req.session.orderMessage
    req.session.orderMessage = null

    const order = await Order.findOne({
      orderId: req.params.orderId
    }).populate('user_id');

    if (!order) {
      return res.redirect('/admin/orders');
    }

    const orderItemsRaw = await OrderItem.find({
      order_id: order._id
    });

    const orderItems = await Promise.all(
      orderItemsRaw.map(async (item) => {

        const product = await Product.findOne({
          'variants._id': item.var_id
        });

        if (!product) return null;

        const variant = product.variants.id(item.var_id);

        return {
           _id: item._id,
          product_name: product.product_name,
          color: variant?.color,
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price,
          image: variant?.images?.[0] || '/images/default-product.png',
          status:item.status
        };
      })
    );

    res.render('vieworderDetails', {
      order,
      orderItems: orderItems.filter(Boolean),orderMessage 
    });

  } catch (error) {
    console.log(error);
    res.redirect('/admin/orders');
  }
};

// const handleReturn = async (req, res) => {
//   try {
//     const {  productId, action } = req.body;
   
//     const orderItem = await OrderItem.findById(productId);
//     if (!orderItem) return res.redirect('/admin/orders');

// const order = await Order.findById(orderItem.order_id);
//     //  APPROVE
//    if (action === "approve") {

//   orderItem.status = "Returned";

//   await orderItem.save();


//   // NEW TOTALS

//   const totals = await calculateOrderTotal(

//     order,

//     orderItem._id

//   );


//   // REFUND

//   let refundAmount =

//     orderItem.final_amount;


//   // COUPON REMOVED ?

//   if (

//     order.coupon_discount > 0 &&

//     order.coupons_id &&

//     totals.couponDiscount === 0

//   ) {

//     refundAmount +=

//       order.coupon_discount;

//   }


//   // PAYMENT CHECK

//   const payment = await Payment.findById(

//     order.payment_id

//   );


//   const shouldRefund =

//     payment &&

//     payment.payment_method !== "COD" &&

//     payment.status === "Success";


//   if (shouldRefund) {

//     const wallet = await Wallet.findOne({

//       userId: order.user_id

//     });


//     if (wallet) {

//       wallet.balance += refundAmount;


//       wallet.transactions.push({

//         type: "credit",

//         amount: refundAmount,

//         description:

//           `Refund for ${order.orderId}`,

//         date: new Date()

//       });


//       await wallet.save();

//     }

//   }


//   // STOCK RESTORE

//   const product = await Product.findOne({

//     "variants._id":

//       orderItem.var_id

//   });


//   if (product) {

//     const variant = product.variants.id(

//       orderItem.var_id

//     );


//     const sizeObj = variant.sizes.find(

//       s => s.size === orderItem.size

//     );


//     if (sizeObj) {

//       sizeObj.stock +=

//         orderItem.quantity;

//     }


//     await product.save();

//   }


//   // UPDATE ORDER TOTALS

//   if (totals.subtotal === 0) {

//     order.status = "Returned";

//   }


//   order.subtotal =

//     totals.subtotal;


//   order.shipping =

//     totals.shipping;


//   order.taxes =

//     totals.taxes;


//   order.coupon_discount =

//     totals.couponDiscount;


//   order.total_price =

//     totals.total;


//   if (

//     totals.couponDiscount === 0

//   ) {

//     order.coupons_id = null;


//     order.total_discount =

//       order.offer_discount;

//   }


//   await order.save();

// }
//     //  REJECT
//     else if (action === "reject") {
//       orderItem.status = "Return Rejected";
//       await orderItem.save();
//     }

//     await updateOrderStatus(orderItem.order_id);
  
//     res.redirect(`/admin/orders/${order.orderId}`);
  
//   }
//  catch (error) {
//     console.log(error);
//     res.redirect('/admin/orders');
//   }
// };

const handleReturn = async (req, res) => {

  try {

    const { productId, action } = req.body;

    const orderItem = await OrderItem.findById(productId);

    if (!orderItem) {

      return res.redirect("/admin/orders");

    }

    const order = await Order.findById(

      orderItem.order_id

    );


    // APPROVE

    if (action === "approve") {

      orderItem.status = "Returned";

      await orderItem.save();


      // NEW TOTALS

      const totals = await calculateOrderTotal(

        order,

        orderItem._id

      );


      // REFUND

      let refundAmount =

        orderItem.final_amount || 0;


      // COUPON REMOVED ?

      // if (

      //   order.coupon_discount > 0 &&

      //   order.coupons_id &&

      //   totals.couponDiscount === 0

      // ) {

      //   refundAmount +=

      //     order.coupon_discount;

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
      // PAYMENT CHECK

      const payment = await Payment.findById(

        order.payment_id

      );


      const shouldRefund =

        payment &&

        payment.payment_method !== "COD" &&

        payment.status === "Success";


      if (shouldRefund) {

        const wallet = await Wallet.findOne({

          userId: order.user_id

        });


        if (wallet) {

          wallet.balance += refundAmount;


          wallet.transactions.push({

            type: "credit",

            amount: refundAmount,

            description:

              `Refund for ${order.orderId}`,

            date: new Date()

          });


          await wallet.save();

        }

      }


      // STOCK RESTORE

      const product = await Product.findOne({

        "variants._id":

          orderItem.var_id

      });


      if (product) {

        const variant = product.variants.id(

          orderItem.var_id

        );


        if (variant) {

          const sizeObj = variant.sizes.find(

            s => s.size === orderItem.size

          );


          if (sizeObj) {

            sizeObj.stock +=

              orderItem.quantity;

          }


          await product.save();

        }

      }


      // UPDATE ORDER TOTALS

      order.subtotal =

        totals.subtotal;


      order.shipping =

        totals.shipping;


      order.taxes =

        totals.taxes;


      order.coupon_discount =

        totals.couponDiscount;


      order.total_price =

        totals.total;


      if (

        totals.couponDiscount === 0

      ) {

        order.coupons_id = null;


        order.total_discount =

          order.offer_discount;

      }

      else {

        order.total_discount =

          order.offer_discount +

          totals.couponDiscount;

      }


      await order.save();

    }


    // REJECT

    else if (

      action === "reject"

    ) {

      orderItem.status =

        "Return Rejected";


      await orderItem.save();

    }


    // FINAL ORDER STATUS

    await updateOrderStatus(

      orderItem.order_id

    );


    return res.redirect(

      `/admin/orders/${order.orderId}`

    );

  }

  catch (error) {

    console.log(

      "Handle Return Error:",

      error

    );


    return res.redirect(

      "/admin/orders"

    );

  }

};





 module.exports={getordersPage,updateProductStatus,viewOrderDetails ,handleReturn }




