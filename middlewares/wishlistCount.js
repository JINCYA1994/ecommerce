const Wishlist = require('../models/wishlistSchema');

const wishlistCountMiddleware = async (req, res, next) => {
  try {
    let count = 0;
  if (req.session.user) {
      const wishlist = await Wishlist.findOne({ userId: req.session.user });

      if (wishlist && wishlist.products.length > 0) {
        count = wishlist.products.length;
      }
    }

    res.locals.wishlistCount = count; 
    next();
  } catch (error) {
    console.log("Cart count middleware error:", error);
    next();
  }
};

module.exports =wishlistCountMiddleware