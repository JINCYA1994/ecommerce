 const User=require('../../models/userSchema')
 const Order=require('../../models/orderSchema')
 const OrderItem=require('../../models/orderItemSchema')
 const Product = require('../../models/productSchema');
 
 
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
   success: req.flash('success'),
   error: req.flash('error')
     });
   } catch (err) {
     console.error("Error loading categories:", err);
     res.status(500).send("Server Error");
   }
 };
 
//  const updateOrderStatus=async (req,res) => {
//   try {
//     const orderId=req.params.orderId
// await Order.updateOne({orderId:orderId},{$set:{status:req.body.status}})
//  res.redirect('/admin/orders')

//   } catch (error) {
//       console.log(error);
//     res.redirect('/admin/orders');
//   }
//  }
   

const allowedStatusUpdate = {
  "Processing": ["Shipped", "Delivered", "Cancelled", "Returned"],
  "Shipped": ["Delivered", "Returned"],
  "Delivered": ["Returned"],
  "Cancelled": [],
  "Returned": []
};

const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const order = await Order.findOne({ orderId });
  if (!order) return res.redirect("/admin/orders");

  const validStatuses = allowedStatusUpdate[order.status];
  if (!validStatuses.includes(status)) {
    
    req.flash("error", "Cannot change status backward!");
    return res.redirect("/admin/orders");
  }

  order.status = status;
  await order.save();
  res.redirect("/admin/orders");
};
// const viewOrderDetails = async (req, res) => {
//   try {

//     const orderId = req.params.orderId;

  
//     const order = await Order.findOne({ orderId })
//       .populate('user_id');

//     if (!order) {
//       return res.redirect('/admin/orders');
//     }

  
//     const orderItems = await OrderItem.find({
//       order_id: order._id
//     }) 


//     res.render('vieworderDetails', {
//       order,
//       orderItems
//     });

//   } catch (error) {
//     console.log(error);
//     res.redirect('/admin/orders');
//   }
// };



const viewOrderDetails = async (req, res) => {
  try {

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
          product_name: product.product_name,
          color: variant?.color,
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price,
          image: variant?.images?.[0] || '/images/default-product.png'
        };
      })
    );

    res.render('vieworderDetails', {
      order,
      orderItems: orderItems.filter(Boolean)
    });

  } catch (error) {
    console.log(error);
    res.redirect('/admin/orders');
  }
};



 
 module.exports={getordersPage,updateOrderStatus,viewOrderDetails }