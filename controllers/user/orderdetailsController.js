const Order = require('../../models/orderSchema');
const OrderItem = require('../../models/orderItemSchema');
const Product = require('../../models/productSchema');
const User=require('../../models/userSchema')




// const listorderDetails  = async (req, res) => {
//   try {

//     const userId = req.session.user;
//     const search = req.query.search || "";
//     const page = parseInt(req.query.page) || 1;
//     const limit = 5;
//     const skip = (page - 1) * limit;

//     let filter = { user_id: userId };

//     if (search) {
//       filter.orderId = { $regex: search, $options: "i" };
//     }

//     const totalOrders = await Order.countDocuments(filter);
//     const userData = await User.findById(userId); 
//     const orders = await Order.find(filter)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit);

//     const totalPages = Math.ceil(totalOrders / limit);

     





//     res.render("order", {
//       orders,
//       currentPage: page,
//       totalPages,
//       search,userData 
//     });

//   } catch (error) {
//     console.log(error);
//     res.redirect("/");
//   }
// };

const listorderDetails  = async (req, res) => {
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
          color: variant.color,
          price: item.price,
          quantity: item.quantity,
          image: variant.images[0],
          cancelledProducts: order.cancelledProducts || []
        };
      }));

      // Add products array to order object
      return {
        ...order._doc, // spread original order fields
        products: products.filter(Boolean) // remove nulls
      };
    }));

    const totalPages = Math.ceil(totalOrders / limit);

    res.render("order", {
      orders,
      currentPage: page,
      totalPages,
      search,
      userData,success: req.session.success
    });
req.session.success=null
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
};

const orderDetails = async (req, res) => {
  try {
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
        image: variant.images[0] 
      };
    }));

    res.render('orderDetails', { order, orderItems: orderItems.filter(Boolean) });

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

    if (order.status!== 'Processing') {
      return res.redirect('/orders');
    }

    order.status = 'Cancelled';
    order.cancel_reason = reason;
    order.cancel_description = description || '';
    await order.save();
    console.log(order)


    const orderItems = await OrderItem.find({ order_id: order._id });

    for (let item of orderItems) {
      const product = await Product.findOne({ 'variants._id': item.var_id });
      if (!product) continue;

      const variant = product.variants.id(item.var_id);
      const size = variant.sizes.find(s => s.size === item.size);

      if (size) {
      
        size.stock += item.quantity;
        await product.save();
      }
    }
req.session.success = "Order Cancelled";
    res.redirect('/orders');

  } catch (error) {
    console.log("Cancel Order Error:", error);
    res.redirect('/orders');
  }
};

// const cancelProduct = async (req, res) => {
//   try {

//     const { orderId, productId } = req.body;

//     const order = await Order.findById(orderId);

//     const item = order.items.find(
//       i => i.productId.toString() === productId
//     );

//     if (!item) {
//       return res.json({ success: false });
//     }

    
//     item.status = "Cancelled";

  
//     const product = await Product.findById(item.productId);

//     const variant = product.variants.id(item.variantId);

//     const size = variant.sizes.find(s => s.size === item.size);

//     if (size) {
//       size.stock += item.quantity;
//     }

//     await product.save();
//     await order.save();

//     res.json({ success: true });

//   } catch (error) {
//     console.log(error);
//   }
// };





const cancelProduct = async (req, res) => {
  try {
    const { orderId, productId, reason, description } = req.body;
    console.log(req.body);

    if (!orderId || !productId) {
      return res.status(400).send("Invalid request");
    }

    // Find the order and the order item
    const order = await Order.findById(orderId);
    if (!order) return res.redirect('/orders');

    const orderItem = await OrderItem.findById(productId);
    if (!orderItem) return res.redirect('/orders');

    // Push product into cancelledProducts array
    order.cancelledProducts.push({
       orderItem_id: orderItem._id,
      var_id: orderItem.var_id,
      quantity: orderItem.quantity,
      cancelReason: reason || "Not specified",
      cancelDescription: description || ""
    });

    // Optional: Reduce stock back to product variant
    const product = await Product.findOne({ 'variants._id': orderItem.var_id });
    if (product) {
      const variant = product.variants.id(orderItem.var_id);
      // If your variant has sizes
      if (variant.sizes && variant.sizes.length) {
        const sizeObj = variant.sizes.find(s => s.size === orderItem.size);
        if (sizeObj) sizeObj.stock += orderItem.quantity;
      } else {
        variant.stock = (variant.stock || 0) + orderItem.quantity;
      }
      await product.save();
    }

    await order.save();

    // Optional: mark order as Cancelled if all products are cancelled
const remainingItems = await OrderItem.find({
  order_id: orderId,
  _id: { $nin: order.cancelledProducts.map(p => p.orderItem_id) }
});

    if (remainingItems.length === 0) {
      order.status = "Cancelled";
      await order.save();
    }
req.session.success = "Product Cancelled";
    res.redirect('/orders');
  } catch (error) {
    console.log("Cancel Product Error:", error);
    res.redirect('/orders');
  }
};


const invoicePage = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findOne({ _id: orderId });

    if (!order) return res.redirect('/orders');

    // Get order items
    const orderItemsRaw = await OrderItem.find({ order_id: order._id });


// Get cancelled item ids
    const cancelledIds = order.cancelledProducts.map(
      item => item.orderItem_id.toString()
    );

    // Remove cancelled products
    const filteredItems = orderItemsRaw.filter(
      item => !cancelledIds.includes(item._id.toString())
    );



    // Populate product and variant details
    const items = await Promise.all(filteredItems.map(async (item) => {
      const product = await Product.findOne({ 'variants._id': item.var_id });
      if (!product) return null;

      const variant = product.variants.id(item.var_id);

      return {
        name: product.product_name,
        quantity: item.quantity,
        price: item.price,
        image: variant.images[0] || '/images/default-product.png'
      };
    }));


    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const delivery = 50; 
    const discount = 0; 
    const total = subtotal + delivery - discount;

    const invoiceData = {
      invoiceNumber: order.orderId,
      date: order.createdAt.toLocaleDateString(),
      customer: order.delivery_address,
      shipping: order.delivery_address,
      paymentMethod: order.paymentMethod || "Cash on Delivery",
      status: order.status,
      items,
      subtotal,
      discount,
      delivery,
      total
    };

    res.render('invoice', { invoice: invoiceData });

  } catch (error) {
    console.log("Invoice Error:", error);
    res.redirect('/orders');
  }
};












module.exports={listorderDetails ,orderDetails,invoicePage,cancelOrder,cancelProduct}