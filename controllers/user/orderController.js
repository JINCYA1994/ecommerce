const User=require('../../models/userSchema')
const Address=require('../../models/addressSchema')
const Product = require('../../models/productSchema');
const Order = require('../../models/orderSchema');
const Cart = require('../../models/cartSchema');
const OrderItem = require('../../models/orderItemSchema');

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


    const address = await Address.findById(selectedAddress);

    if (!address) {
      return res.redirect('/checkout');
    }


    let totalAmount = 0;

    cart.items.forEach(item => {

      const variant = item.product_id.variants.find(v =>
        v._id.toString() === item.var_id.toString()
      );

      const price = variant.discount_price && variant.discount_price < variant.price
        ? variant.discount_price
        : variant.price;

      totalAmount += price * item.quantity;
    });
const generateOrderID = () => {
  return "ORD" + Math.floor(100000 + Math.random() * 900000);
};
    const newOrder = await Order.create({
      user_id: userId,
      orderId:generateOrderID(),
      addresses_id: address._id,
      total_price: totalAmount,
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
 
    for (let item of cart.items) {
  const product = await Product.findById(item.product_id._id);

  if (!product) {
    return res.redirect('/cart');
  }
 const variant = product.variants.id(item.var_id);
    

      const price = variant.discount_price && variant.discount_price < variant.price
        ? variant.discount_price
        : variant.price;

  const sizeObj = variant.sizes.find(s =>
    s.size === item.size
  );

  if (!sizeObj) {
    return res.redirect('/cart');
  }


  if (sizeObj.stock < item.quantity) {
    return res.send("Product out of stock");
  }
  sizeObj.stock -= item.quantity;


  await product.save();

console.log(product)
      await OrderItem.create({
      order_id: newOrder._id,
        var_id: item.var_id,
        quantity: item.quantity,
        price: price,
        size:item.size
      });
    }

  
    cart.items = [];
    await cart.save();

  
    res.redirect(`/order-success/${newOrder.orderId}`);

  } catch (error) {
    console.log("Place Order Error:", error);
    res.redirect('/checkout');
  }
};




const getOrderSuccessPage = async (req, res) => {
  try {

    const userId = req.session.user;
    const orderId = req.params.id;

    const order = await Order.findOne({
    orderId: orderId,
      user_id: userId
    });

    if (!order) {
      return res.redirect('/');
    }

    res.render("orderSuccess", {
      orderId: order.orderId 
    });

  } catch (error) {
    res.redirect('/');
  }
};



module.exports = {
  placeOrderpage,getOrderSuccessPage 
};





