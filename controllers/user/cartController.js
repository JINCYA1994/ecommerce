const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const Wishlist = require('../../models/wishlistSchema')
const { getFinalPrice, getActiveOffers } = require('../../helpers/offerTotal');


const getcartpage = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = req.session.user || null;
    const cartError = req.session.cartError;
    req.session.cartError = null;
    if (!userId) return res.redirect('/login');

    const cart = await Cart.findOne({ user_id: userId }).populate('items.product_id');

    if (!cart || cart.items.length === 0) {
      return res.render('cart', { cart: null, userData, cartError });
    }

    let grandTotal = 0;

    const updatedItems = await Promise.all(
      cart.items.map(async (item) => {

        const product = item.product_id;

        // //  remove invalid product
        // if (!product) {
        //   await Cart.updateOne(
        //     { _id: cart._id },
        //     { $pull: { items: { _id: item._id } } }
        //   );
        //   return null;
        // }

        const variant = product.variants.id(item.var_id);

        // //  remove invalid variant
        // if (!variant) {
        //   await Cart.updateOne(
        //     { _id: cart._id },
        //     { $pull: { items: { _id: item._id } } }
        //   );
        //   return null;
        // }

        const selectedSize = variant.sizes.find(s => s.size == item.size);

        // //  remove invalid size
        // if (!selectedSize) {
        //   await Cart.updateOne(
        //     { _id: cart._id },
        //     { $pull: { items: { _id: item._id } } }
        //   );
        //   return null;
        // }

        //  remove unlisted/deleted
        // if (!selectedSize.isListed || selectedSize.isDeleted) {
        //   await Cart.updateOne(
        //     { _id: cart._id },
        //     { $pull: { items: { _id: item._id } } }
        //   );
        //   return null;
        // }
        const isUnavailable =

          !product.isListed ||

          product.isDeleted ||

          !selectedSize ||

          !selectedSize.isListed ||

          selectedSize.isDeleted ||

          selectedSize.stock === 0;

        const finalQty = Math.min(
          item.quantity,
          selectedSize.stock,
          selectedSize.maxOrderQty
        );

        if (item.quantity !== finalQty) {
          item.quantity = finalQty;

          await Cart.updateOne(
            { _id: cart._id, "items._id": item._id },
            { $set: { "items.$.quantity": finalQty } }
          );
        }
        const offers = await getActiveOffers();
        const { finalPrice, discount } =
          getFinalPrice(product, variant, offers);

        const total = finalPrice * item.quantity;
        grandTotal += total;

        return {
          _id: item._id,
          product_name: product.product_name,
          image: variant.images[0],
          color: variant.color,
          size: item.size,
          price: finalPrice,
          originalPrice: variant.price,
          offerPercentage: discount,
          quantity: item.quantity,
          total,
          stock: selectedSize.stock,
          maxOrderQty: selectedSize.maxOrderQty,
          isUnavailable
        };

      })
    );

    const filteredItems = updatedItems.filter(Boolean);

    res.render('cart', {
      cart: { items: filteredItems, total: grandTotal, cartError },
      userData, cartError
    });

  } catch (error) {
    console.log("Get cart error:", error);
    res.status(500).send("Server Error");
  }
};





const addToCart = async (req, res) => {
  try {
    const userId = req.session.user;

    const { productId, variantId, size, returnUrl, itemId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login"
      });
    }

    //  Get product
    // const product = await Product.findById(productId);
    // const product = await Product.findById(productId).populate("category");
    const product = await Product.findById(productId).populate("category_id");

    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }
    if (!product.isListed || product.isDeleted) {

      return res.json({ success: false, message: "Product unavailable" });

    }
  if(!product.category_id ||!product.category_id.isListed ||product.category_id.isDeleted){

 return res.json({success:false,message:"Category unavailable"});

}



    const variant = product.variants.id(variantId);

    if(!variant){
      return res.json({success:false,message:"Variant unavailable"});
}
    const selectedSize = variant.sizes.find(
      s => s.size == size && !s.isDeleted && s.isListed
    );

    if (!selectedSize) {
      return res.json({
        success: false,
        message: "Size Unavailable"
      });
    }

    if (!selectedSize.isListed || selectedSize.isDeleted) {
      return res.json({
        success: false,
        message: "This variant is unavailable"
      });
    }

    if (selectedSize.stock <= 0) {
      return res.json({
        success: false,
        message: "Out of stock"
      });
    }

    //  Get cart
    let cart = await Cart.findOne({ user_id: userId });

    if (!cart) {
      cart = new Cart({
        user_id: userId,
        items: []
      });
    }

    //  Check existing item
    const existingItem = cart.items.find(item =>
      item.product_id.equals(productId) &&
      item.var_id.equals(variantId) &&
      item.size == size
    );

    if (existingItem) {

      if (existingItem.quantity + 1 > selectedSize.stock) {
        return res.json({ success: false, message: "Stock limit reached" });
      }

      if (existingItem.quantity + 1 > selectedSize.maxOrderQty) {
        return res.json({
          success: false,
          message: `Maximum order limit is ${selectedSize.maxOrderQty}`
        });
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

    //  Remove from wishlist (if coming from wishlist)
    if (itemId) {
      await Wishlist.updateOne(
        { userId },
        { $pull: { products: { _id: itemId } } }
      );
    }

    //  Updated counts
    const wishlist = await Wishlist.findOne({ userId });
    const wishlistCount = wishlist ? wishlist.products.length : 0;

    const cartCount = cart.items.length;

    return res.json({
      success: true,
      wishlistCount,
      cartCount
    });

  }




  catch (error) {
    console.log("Add to cart error:", error);
    res.json({ success: false });
  }

}




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
    const offers = await getActiveOffers();
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
        const { finalPrice } =
          getFinalPrice(product, variant, offers);

        grandTotal += finalPrice * item.quantity;

        totalItems += item.quantity; // total quantity
      });
    }

    return res.json({ success: true, cartTotal: grandTotal, totalItems });

  } catch (error) {
    console.log("Remove error:", error);
    return res.json({ success: false });
  }
};



const updateQuantity = async (req, res) => {
  try {
    const userId = req.session.user;
    const { itemId, action } = req.body;

    const cart = await Cart.findOne({ user_id: userId });
    if (!cart) return res.json({ success: false, message: 'Cart not found' });

    const item = cart.items.id(itemId);
    if (!item) return res.json({ success: false, message: 'Item not found' });

    const product = await Product.findById(item.product_id);
    const variant = product.variants.id(item.var_id);
    const selectedSize = variant.sizes.find(s => s.size == item.size);


    if (action === 'increment') {

      if (item.quantity >= selectedSize.stock) {
        return res.json({
          success: false,
          message: 'Stock limit reached'
        });
      }

      if (item.quantity >= selectedSize.maxOrderQty) {
        return res.json({
          success: false,
          message: `Maximum order limit is ${selectedSize.maxOrderQty}`
        });
      }

      item.quantity += 1;
    }


    else if (action === 'decrement') {
      if (item.quantity > 1) item.quantity -= 1;
    }

    await cart.save();

    let grandTotal = 0;

    const productIds = cart.items.map(i => i.product_id);

    const products = await Product.find({ _id: { $in: productIds } });
    const offers = await getActiveOffers();
    cart.items.forEach(i => {
      const prod = products.find(p => p._id.equals(i.product_id));
      if (!prod) return;

      const varnt = prod.variants.id(i.var_id);
      if (!varnt) return;

      const selSize = varnt.sizes.find(s => s.size == i.size);
      if (!selSize) return;

      const { finalPrice } =
        getFinalPrice(prod, varnt, offers);

      grandTotal += finalPrice * i.quantity;

    });
    let totalItems = 0;

    cart.items.forEach(i => {
      totalItems += i.quantity;
    });
    res.json({ success: true, quantity: item.quantity, cartTotal: grandTotal, totalItems });

  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Server error' });
  }
};

const checkCheckoutItems = async (req, res) => {

  try {

    const userId = req.session.user;

    const cart = await Cart.findOne({ user_id: userId }).populate("items.product_id");

    let unavailable = false;

    for (let item of cart.items) {

      const product = item.product_id;

      const variant = product?.variants.id(item.var_id);

      const selectedSize = variant?.sizes.find(s => s.size == item.size);

      const isUnavailable = !product || !product.isListed || product.isDeleted ||

        !variant || !selectedSize || !selectedSize.isListed || selectedSize.isDeleted || selectedSize.stock === 0;

      if (isUnavailable) {

        unavailable = true;

        break;

      }
    }

    return res.json({ success: true, unavailable });
  }

  catch (error) {

    return res.json({ success: false });
  }
}








module.exports = {
  getcartpage,
  addToCart,
  removeCartItem, updateQuantity, checkCheckoutItems
};