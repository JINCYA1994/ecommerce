const Cart = require('../models/cartSchema');

const cartCountMiddleware = async (req, res, next) => {
  try {
    let count = 0;

    if (req.session.user) {
      const cart = await Cart.findOne({ user_id: req.session.user });

      if (cart && cart.items.length > 0) {
        count = cart.items.reduce((total, item) => {
          return total + item.quantity;
        }, 0);
      }
    }

    res.locals.cartCount = count; 
    next();
  } catch (error) {
    console.log("Cart count middleware error:", error);
    next();
  }
};

module.exports = cartCountMiddleware;