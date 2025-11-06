const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Review= require('../../models/reviewSchema');



const loadShop = async (req, res) => {
  try {
    const categoryFilter = req.query.category || "";
    const minPrice = parseInt(req.query.minPrice) || 0;
    const maxPrice = parseInt(req.query.maxPrice) || 1000000;
    const search = req.query.search || "";
    const sort = req.query.sort || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 9; // number of products per page

    // Base query
    let query = {};

      if (categoryFilter) {
      const category = await Category.findOne({ name: categoryFilter });
      if (category) {
        query.category_id = category._id;
      }
    }




    if (search) query.product_name = { $regex: search, $options: "i" };

    // Fetch products
    let allProducts = await Product.find(query)
      .populate("category_id")
      .lean();

    const productIds = allProducts.map(p => p._id);
    const allReviews = await Review.find({ product: { $in: productIds } }).lean();
     allProducts.forEach(product => {
      product.reviews = allReviews.filter(r => r.product.toString() === product._id.toString());
    });

    // Filter by price
    allProducts = allProducts.filter(p => {
      if (p.variants.length > 0 && p.variants[0].price != null) {
        return p.variants.some(v => v.price >= minPrice && v.price <= maxPrice);
      }
      return false;
    });

    // Random variant for each product
    allProducts.forEach(p => {
      if (p.variants && p.variants.length > 0) {
        const randomIndex = Math.floor(Math.random() * p.variants.length);
        p.randomVariant = p.variants[randomIndex];
      }
    });

    // Sorting
    if (sort === "lowToHigh") {
      allProducts.sort((a, b) => (a.randomVariant?.price || 0) - (b.randomVariant?.price || 0));
    } else if (sort === "highToLow") {
      allProducts.sort((a, b) => (b.randomVariant?.price || 0) - (a.randomVariant?.price || 0));
    } else if (sort === "aToZ") {
      allProducts.sort((a, b) => a.product_name.localeCompare(b.product_name));
    } else if (sort === "zToA") {
      allProducts.sort((a, b) => b.product_name.localeCompare(a.product_name));
    }

    // Pagination
    const totalProducts = allProducts.length;
    const totalPages = Math.ceil(totalProducts / limit);
    const paginatedProducts = allProducts.slice((page - 1) * limit, page * limit);

    const categories = await Category.find({ isDeleted: false, isListed: true });
    const user=req.session.user
   if(user){

  const userData=await User.findOne({_id:user._id})
 res.render("shop", {
      products: paginatedProducts,
      categories,
      category: categoryFilter,
      search,
      minPrice,
      maxPrice,
      sort,
      currentPage: page,
      totalPages,userData
    })}
    else{
 return  res.render("shop", {
      products: paginatedProducts,
      categories,
      category: categoryFilter,
      search,
      minPrice,
      maxPrice,
      sort,
      currentPage: page,
      totalPages
    })}
  } catch (error) {
    console.error("Error loading shop:", error.message);
    res.render("404");
  }
};

module.exports = { loadShop };
