const Order = require('../../models/orderSchema');
const OrderItem = require('../../models/orderItemSchema');
const Product = require('../../models/productSchema');
const User=require('../../models/userSchema')





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
          size:item.size,
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
        image: variant.images[0] , status: item.status 
      };
    }));

    res.render('orderDetails', { order, userData,orderItems: orderItems.filter(Boolean) });

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

    if (orderItem.status !== "Delivered") {
      return res.redirect('/orders');
    }

    orderItem.status = "Return Requested";
    orderItem.returnReason = reason;
    orderItem.returnDescription = description;

    await orderItem.save();

    req.session.orderMessage= "Return Requested";
    req.session.orderMessage = null;
    res.redirect('/orders');

  } catch (error) {
    console.log(error);
    res.redirect('/orders');
  }
};



const cancelProduct = async (req, res) => {
  try {
    const { orderId, productId, reason, description } = req.body;

    const orderItem = await OrderItem.findById(productId);
    if (!orderItem) return res.redirect('/orders');

    // already cancelled check
    if (orderItem.status === "Cancelled") {
      req.session.orderMessage = "Already Cancelled";
      return res.redirect('/orders');
    }

    // update status
    orderItem.status = "Cancelled";
    orderItem.cancelReason = reason;
    orderItem.cancelDescription = description;
    await orderItem.save();

    // STOCK RESTORE (VERY IMPORTANT)
    const product = await Product.findOne({ 'variants._id': orderItem.var_id });

    if (product) {
      const variant = product.variants.id(orderItem.var_id);

      if (variant) {
        const sizeObj = variant.sizes.find(s => s.size === orderItem.size);

        if (sizeObj) {
          sizeObj.stock += orderItem.quantity;
          await product.save();
        }
      }
    }

    
    const remaining = await OrderItem.find({
      order_id: orderItem.order_id,
      status: { $ne: "Cancelled" }
    });

    if (remaining.length === 0) {
      await Order.findByIdAndUpdate(orderItem.order_id, {
        status: "Cancelled"
      });
    }

    req.session.orderMessage = "Product Cancelled Successfully";
    return res.redirect('/orders');

  } catch (error) {
    console.log(error);
    res.redirect('/orders');
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
      item => item.status !== "Cancelled"
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

    // calculations
    const subtotal = cleanItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    const delivery = 50;
    const discount = 0;
    const total = subtotal + delivery - discount;

    // invoice object
    const invoiceData = {
      invoiceNumber: order.orderId,
      date: order.createdAt.toLocaleDateString(),
      customer: order.delivery_address,
      shipping: order.delivery_address,
      paymentMethod: order.payment_method || "Cash on Delivery",
      status: order.status,
      items: cleanItems,
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











module.exports={listorderDetails ,orderDetails,invoicePage,cancelOrder,cancelProduct,returnProduct}