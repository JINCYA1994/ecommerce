const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');

// Get Cart Page
// const getcartpage = async (req, res) => {
//   try {
//     const userId = req.session.user;

//     const userData = req.session.user || null;
//     if (!userId) return res.redirect('/login');

//     const cart = await Cart.findOne({ user_id: userId }).populate('items.product_id');

//     if (!cart || cart.items.length === 0) {
//       return res.render('cart', { cart: null,userData });
//     }

//     let grandTotal = 0;
// const updatedItems = await Promise.all(
//       cart.items.map(async (item) => {

//         const product = item.product_id;
//         if (!product){
//             await Cart.updateOne(
//     { _id: cart._id },
//     { $pull: { items: { _id: item._id } } }
//   );
//  return null;
//         }

//         const variant = product.variants.id(item.var_id);
//         if (!variant){

//   await Cart.updateOne(
//     { _id: cart._id },
//     { $pull: { items: { _id: item._id } } }
//   );

//   return null;
// }

//         const selectedSize = variant.sizes.find(
//           s => s.size == item.size
//         );
//         if (!selectedSize)  {

//   await Cart.updateOne(
//     { _id: cart._id },
//     { $pull: { items: { _id: item._id } } }
//   );

//   return null;
// }

// if (item.quantity > selectedSize.stock) {
//   item.quantity = selectedSize.stock;

//   await Cart.updateOne(
//     { _id: cart._id, "items._id": item._id },
//     { $set: { "items.$.quantity": selectedSize.stock } }
//   );
// }

//  if (!selectedSize.isListed || selectedSize.isDeleted) {

//           await Cart.updateOne(
//             { _id: cart._id },
//             { $pull: { items: { _id: item._id } } }
//           );

//           return null;
//         }

//         const price = variant.discount_price || variant.price;
//         const total = price * item.quantity;
//         grandTotal += total;

//         return {
//           _id: item._id,
//           product_name: product.product_name,
//           image: variant.images[0],
//           color: variant.color,
//           size: item.size,
//           price,
//           quantity: item.quantity,
//           total,
//           stock: selectedSize.stock
//         };

//       })
//     );

//     const filteredItems = updatedItems.filter(Boolean);

//     res.render('cart', {
//       cart: { items: filteredItems, total: grandTotal },
//       userData
//     });

//   } catch (error) {
//     console.log("Get cart error:", error);
//     res.status(500).send("Server Error");
//   }
// };
    

const getcartpage = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = req.session.user || null;
const cartError = req.session.cartError;
req.session.cartError = null;
    if (!userId) return res.redirect('/login');

    const cart = await Cart.findOne({ user_id: userId }).populate('items.product_id');

    if (!cart || cart.items.length === 0) {
      return res.render('cart', { cart: null, userData, cartError   });
    }

    let grandTotal = 0;

    const updatedItems = await Promise.all(
      cart.items.map(async (item) => {

        const product = item.product_id;

        //  remove invalid product
        if (!product) {
          await Cart.updateOne(
            { _id: cart._id },
            { $pull: { items: { _id: item._id } } }
          );
          return null;
        }

        const variant = product.variants.id(item.var_id);

        //  remove invalid variant
        if (!variant) {
          await Cart.updateOne(
            { _id: cart._id },
            { $pull: { items: { _id: item._id } } }
          );
          return null;
        }

        const selectedSize = variant.sizes.find(s => s.size == item.size);

        //  remove invalid size
        if (!selectedSize) {
          await Cart.updateOne(
            { _id: cart._id },
            { $pull: { items: { _id: item._id } } }
          );
          return null;
        }

        //  remove unlisted/deleted
        if (!selectedSize.isListed || selectedSize.isDeleted) {
          await Cart.updateOne(
            { _id: cart._id },
            { $pull: { items: { _id: item._id } } }
          );
          return null;
        }

        
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

        //  price calculation
        const price =
          variant.discount_price && variant.discount_price > 0
            ? variant.discount_price
            : variant.price;

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
          total,
          stock: selectedSize.stock,
          maxOrderQty: selectedSize.maxOrderQty,
          isUnavailable: !product.isListed || product.isDeleted || selectedSize.stock === 0,
        };

      })
    );

    const filteredItems = updatedItems.filter(Boolean);

    res.render('cart', {
      cart: { items: filteredItems, total: grandTotal,cartError  },
      userData,  cartError
    });

  } catch (error) {
    console.log("Get cart error:", error);
    res.status(500).send("Server Error");
  }
};




 const addToCart = async (req, res) => {
  try {
    const userId = req.session.user;
   
    const { productId, variantId, size,  returnUrl} = req.body;
console.log(req.body)
    if (!userId) return res.redirect('/login');

    const product = await Product.findById(productId);
    if (!product) return res.redirect('/shop');

    const variant = product.variants.id(variantId);
    if (!variant) return res.redirect('/shop');

    const selectedSize = variant.sizes.find(
      s => s.size == size && !s.isDeleted && s.isListed
    );

    if (!selectedSize || selectedSize.stock <= 0) {
      return res.redirect('/shop');
    }

    let cart = await Cart.findOne({ user_id: userId });

    if (!cart) {
      cart = new Cart({
        user_id: userId,
        items: []
      });
    }
console.log("Incoming:", productId, variantId, size);
cart.items.forEach(i => {
  console.log("Cart Item:", i.product_id.toString(), i.var_id.toString(), i.size);
});


const existingItem = cart.items.find(item =>
  item.product_id.equals(productId) &&
  item.var_id.equals(variantId) &&
  item.size == size
);


   

if (existingItem) {

  if (existingItem.quantity + 1 > selectedSize.stock) {
    return res.redirect('/shop');
  }

  // max order limit check
if (existingItem.quantity + 1 > selectedSize.maxOrderQty) {
  req.session.cartMessage = `Maximum order limit is ${selectedSize.maxOrderQty}`;
  return res.redirect('/shop');
}
  existingItem.quantity += 1;

}

     else {

      cart.items.push({
        product_id: productId,
        var_id: variantId,
        size,
        quantity: 1
      });

    }

    await cart.save();

req.session.cartMessage = "Product added to cart successfully!";
   res.redirect(returnUrl || '/shop');
   console.log(returnUrl)

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

  if  (item.quantity >= selectedSize.maxOrderQty) {
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

cart.items.forEach(i => {
  const prod = products.find(p => p._id.equals(i.product_id));
  if (!prod) return;

  const varnt = prod.variants.id(i.var_id);
  if (!varnt) return;

  const selSize = varnt.sizes.find(s => s.size == i.size);
  if (!selSize) return;

  const price =
    varnt.discount_price && varnt.discount_price > 0
      ? varnt.discount_price
      : varnt.price;

  grandTotal += price * i.quantity;
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





module.exports = {
  getcartpage,
  addToCart,
  removeCartItem,updateQuantity
};