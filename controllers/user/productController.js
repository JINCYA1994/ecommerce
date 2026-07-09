const User=require('../../models/userSchema')
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const Review = require('../../models/reviewSchema');
const session=require('express-session')
const Offer = require('../../models/offerSchema');
const OrderItem = require("../../models/orderItemSchema");



//  Load Product Details Page
const loadProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;
    const selectedVariantId = req.query.variant; 
    const cartMessage = req.session.cartMessage;
     
    req.session.cartMessage = null;
    
    console.log("Selected Variant:", selectedVariantId);
    const product = await Product.findById(productId)
      .populate('category_id')
      .lean();
 
     if (!product || product.isListed === false) {
              return res.status(404).render('404'); 
  
        }
   
    let activeVariant;

//  if query exists
       if (selectedVariantId) {
  activeVariant = product.variants.find(
    v => v._id.toString() === selectedVariantId
  );
}

//  fallback (only if not found)
if (!activeVariant) {
  activeVariant = product.variants.find(v => v.isListed) || product.variants[0];
}
     // Active offers
    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).lean();

    // Product offer
    let productOffer = offers.find(
      (o) =>
        o.offerType === "PRODUCT" &&
        o.product_id?.toString() === product._id.toString()
    );

    // Category offer
    let categoryOffer = offers.find(
      (o) =>
        o.offerType === "CATEGORY" &&
        o.category_id?.toString() === product.category_id._id.toString()
    );

    let discount = 0;

    if (productOffer && categoryOffer) {
      discount = Math.max(
        productOffer.discountPercentage,
        categoryOffer.discountPercentage
      );
    } else if (productOffer) {
      discount = productOffer.discountPercentage;
    } else if (categoryOffer) {
      discount = categoryOffer.discountPercentage;
    }

    activeVariant.offerPercentage = discount;

    activeVariant.finalPrice =
      discount > 0
        ? Math.round(
            activeVariant.price -
              (activeVariant.price * discount) / 100
          )
        : activeVariant.price;

    // Related products
    const related = await Product.find({
      category_id: product.category_id,
      _id: { $ne: productId }
    })
      .limit(4)
      .lean();

    // Apply offers to related products
    related.forEach((relatedProduct) => {
      relatedProduct.variants.forEach((variant) => {
        let relatedProductOffer = offers.find(
          (o) =>
            o.offerType === "PRODUCT" &&
            o.product_id?.toString() === relatedProduct._id.toString()
        );

        let relatedCategoryOffer = offers.find(
          (o) =>
            o.offerType === "CATEGORY" &&
            o.category_id?.toString() ===
              relatedProduct.category_id.toString()
        );

        let relatedDiscount = 0;

        if (relatedProductOffer && relatedCategoryOffer) {
          relatedDiscount = Math.max(
            relatedProductOffer.discountPercentage,
            relatedCategoryOffer.discountPercentage
          );
        } else if (relatedProductOffer) {
          relatedDiscount =
            relatedProductOffer.discountPercentage;
        } else if (relatedCategoryOffer) {
          relatedDiscount =
            relatedCategoryOffer.discountPercentage;
        }

        variant.offerPercentage = relatedDiscount;

        variant.finalPrice =
          relatedDiscount > 0
            ? Math.round(
                variant.price -
                  (variant.price * relatedDiscount) / 100
              )
            : variant.price;
      });
    });


    const reviews = await Review.find({ product: productId })
      .populate('user', 'username')
      .lean();

let canReview = false;

if (req.session.user) {

  const deliveredItem = await OrderItem.findOne({
    product_id: productId,
    status: "Delivered"
  }).populate({
    path: "order_id",
    match: {
      user_id: req.session.user._id
    }
  });

  if (deliveredItem && deliveredItem.order_id) {
    canReview = true;
  }

}



 const userData = req.session.user || null;
    res.render('productDetails', {
      product,
      related,
      reviews,
      activeVariant,
      userData,  cartMessage, canReview
    });
  } catch (error) {
    console.error('Error loading product details:', error.message);
    res.status(500).send('Server error');
  }
};


//  Submit a New Review
const submitReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const productId = req.params.id;
    const userId = req.session.user?._id; // Assuming session stores user data

    if (!userId) {
      return res.redirect('/login');
    }
const deliveredItem = await OrderItem.findOne({
  product_id: productId,
  status: "Delivered"
}).populate({
  path: "order_id",
  match: {
    user_id: userId
  }
});

if (!deliveredItem || !deliveredItem.order_id) {

  return res.status(403).send("You can review only delivered products that you purchased.");

}
    // Check if user already reviewed this product
    const existing = await Review.findOne({ product: productId, user: userId });
    if (existing) {
      existing.rating = rating;
      existing.comment = comment;
      await existing.save();
    } else {
      await Review.create({
        product: productId,
        user: userId,
        rating,
        comment
      });
    }

    //  Update product’s average rating
    const reviews = await Review.find({ product: productId });
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = totalRating / reviews.length;

    await Product.findByIdAndUpdate(productId, {
      averageRating: avgRating,
      reviewCount: reviews.length
    });

    res.redirect(`/productDetails/${productId}`);
  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(500).send("Error submitting review");
  }
};

module.exports = { loadProductDetails, submitReview };
