const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Wishlist = require('../../models/wishlistSchema')
const Cart = require('../../models/cartSchema');




const getwishlistPage = async (req, res) => {
  try {

    const userId = req.session.user;
    if (!userId) {

      return res.status(401).json({

        success: false,

        message: "Please login"

      });

    }

    if (!userId) return res.redirect('/login');
   
    const userData = req.session.user || null;
    const wishlistError = req.session.wishlistError;
    req.session.wishlistError = null;


    const wishlist = await Wishlist.findOne({ userId })
      .populate({
        path: "products.productId",

        populate: {
          path: "category_id"
        }
      })
   

    if (!wishlist || wishlist.products.length === 0) {
      return res.render("wishlist", {
        wishlist: null,
        userData,
        wishlistError
      });
    }
 wishlist.products = wishlist.products.filter(item => {

      return item.productId &&

        item.productId.isListed &&

        !item.productId.isDeleted &&

        item.productId.category_id &&

        item.productId.category_id.isListed &&

        !item.productId.category_id.isDeleted;

    });
    await wishlist.save();
    res.render("wishlist", {
      wishlist: wishlist.products,
      userData,
      wishlistError
    });

  } catch (error) {
    console.log("Wishlist page error:", error);
    res.status(500).send("Server Error");
  }
}



//add to wishlist
const addToWishlist = async (req, res) => {

  try {

    const userId = req.session.user;
    if (!userId) {

return res.status(401).json({

success:false,

message:"Please login"

});

}
    const { productId, var_id, size } = req.body;

const product =await Product.findById(productId).populate("category_id");

if(!product){

return res.json({success:false,message:"Product not found"});

}

if(
!product.isListed ||

product.isDeleted ||

!product.category_id ||

!product.category_id.isListed ||

product.category_id.isDeleted
){

return res.json({success:false,message:"Product unavailable"});

}

const variant =product.variants.id(var_id);

if(!variant){

return res.json({success:false,message:"Variant unavailable"});

}

const selectedSize =variant.sizes.find(s=>s.size==size &&s.isListed &&!s.isDeleted);

if(!selectedSize){

return res.json({success:false,message:"Size unavailable"});

}
    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {

      wishlist = new Wishlist({
        userId,
        products: []
      });

    }

    const exists = wishlist.products.find(p =>
      p.productId.toString() === productId &&
      p.var_id.toString() === var_id &&
      p.size == size
    );

    if (exists) {

      return res.json({ success: false, message: "Already in wishlist" });

    }

    wishlist.products.push({
      productId,
      var_id,
      size
    });

    await wishlist.save();
    const count = wishlist.products.length;
    res.json({ success: true, count });

  } catch (error) {

    console.log(error);

  }

}


//remove wishlist items




const removeWishlistItem = async (req, res) => {
  try {
    const userId = req.session.user;
    const itemId = req.params.id;

    await Wishlist.updateOne(
      { userId: userId },
      { $pull: { products: { _id: itemId } } }
    );
    const wishlist =
      await Wishlist.findOne({ userId });

    const count =
      wishlist
        ? wishlist.products.length
        : 0;

    res.json({

      success: true,

      count

    });


  }
  catch (error) {
    console.log("Remove error:", error);
    return res.json({ success: false });
  }
};






module.exports = {
  getwishlistPage, addToWishlist, removeWishlistItem,

};