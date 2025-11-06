const User=require('../../models/userSchema')
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const Review = require('../../models/reviewSchema');

// 📄 Load Product Details Page
const loadProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId)
      .populate('category_id')
      .lean();

    const related = await Product.find({
      category_id: product.category_id,
      _id: { $ne: productId }
    }).limit(4).lean();

    const reviews = await Review.find({ product: productId })
      .populate('user', 'username') // to show user name in reviews
      .lean();

    // product.reviews = reviews;

    res.render('productDetails', { product, related,reviews});
  } catch (error) {
    console.error("Error loading product details:", error);
    res.status(500).send("Something went wrong");
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

    // 🔄 Update product’s average rating
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
