const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');

// Get Cart Page
const getcartpage = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) return res.redirect('/login');

    const cart = await Cart.findOne({ user_id: userId }).populate('items.product_id');

    if (!cart || cart.items.length === 0) {
      return res.render('cart', { cart: null });
    }

    let grandTotal = 0;

    const updatedItems = cart.items
      .map(item => {
        const product = item.product_id;
        if (!product) return null;

        const variant = product.variants.id(item.var_id);
        if (!variant) return null;

        const selectedSize = variant.sizes.find(
          s => s.size == item.size
        );
        if (!selectedSize) return null;

        const price = variant.discount_price || variant.price;
        const total = price * item.quantity;
        grandTotal += total;

        return {
          _id: item._id,
          product_name: product.product_name,
          image: variant.images[0],
          color: variant.color,
          size: item.size,
          price,
          quantity: item.quantity,
          total
        };
      })
      .filter(Boolean);

    res.render('cart', { cart: { items: updatedItems, total: grandTotal } });

  } catch (error) {
    console.log("Get cart error:", error);
    res.status(500).send("Server Error");
  }
};


const addToCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId, variantId, size } = req.body;

    if (!userId) return res.redirect('/login');

    const product = await Product.findById(productId);
    if (!product) return res.redirect('/shop');

    const variant = product.variants.id(variantId);
    if (!variant) return res.redirect('/shop');

    const selectedSize = variant.sizes.find(
      s => s.size == size && !s.isDeleted && s.isListed
    );
    if (!selectedSize || selectedSize.stock <= 0) return res.redirect('/shop');

    let cart = await Cart.findOne({ user_id: userId });
    if (!cart) {
      cart = new Cart({ user_id: userId, items: [] });
    }

    const existingItem = cart.items.find(
      item =>
        item.product_id.toString() === productId &&
        item.var_id.toString() === variantId &&
        item.size === size
    );

    if (existingItem) {
      if (existingItem.quantity + 1 > selectedSize.stock) {
        return res.redirect('/shop');
      }
      existingItem.quantity += 1;
    } else {
      cart.items.push({
        product_id: productId,
        var_id: variantId,
        size,
        quantity: 1
      });
    }

    await cart.save();
    res.redirect('/shop');

  } catch (error) {
    console.log("Add to cart error:", error);
    res.redirect('/shop');
  }
};




const removeCartItem = async (req, res) => {
  try {
    const userId = req.session.user;
    const itemId = req.params.id;

    await Cart.updateOne(
      { user_id: userId },
      { $pull: { items: { _id: itemId } } }
    );

    // Get updated cart
    const cart = await Cart.findOne({ user_id: userId }).populate('items.product_id');

    let grandTotal = 0;
    let totalItems = 0;

    if (cart && cart.items.length > 0) {
      cart.items.forEach(item => {
        const product = item.product_id;
        if (!product) return;
        const variant = product.variants.id(item.var_id);
        if (!variant) return;
        const selectedSize = variant.sizes.find(s => s.size == item.size);
        if (!selectedSize) return;

        const price = variant.discount_price || variant.price;
        grandTotal += price * item.quantity;
        totalItems += item.quantity; // total quantity
      });
    }

    return res.json({ success: true, cartTotal: grandTotal, totalItems });

  } catch (error) {
    console.log("Remove error:", error);
    return res.json({ success: false });
  }
};






module.exports = {
  getcartpage,
  addToCart,
  removeCartItem
};