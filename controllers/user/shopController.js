

const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');

const loadShop = async (req, res) => {
  try {
    const category = req.query.category || "";
    const minPrice = parseInt(req.query.minPrice) || 0;
    const maxPrice = parseInt(req.query.maxPrice) || 1000000;
    const search = req.query.search || "";
    const sort = req.query.sort || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 9; // products per page 

    //  Fetch all active categories
    const categories = await Category.find({ isListed: true });

    //  Build dynamic query
     let query = {};
   

  
    if (category) {
      const selectedCategory = await Category.findOne({ _id: category, isListed: true });
      if (selectedCategory) {
        query.category_id = selectedCategory._id;
      } else {
        // If category is unlisted, show empty result
        query.category_id = null;
      }
    } else {
      // No category filter → show only products from listed categories
      const listedCategoryIds = categories.map(cat => cat._id);
      query.category_id = { $in: listedCategoryIds };
    }
    // Search filter
    if (search) query.product_name = { $regex: search, $options: "i" };

    // 💰 Price filter — handles both price & discount_price
    query.$or = [
      { "variants.discount_price": { $gte: minPrice, $lte: maxPrice } },
      {
        $and: [
          { "variants.discount_price": { $exists: false } },
          { "variants.price": { $gte: minPrice, $lte: maxPrice } },
        ],
      },
    ];

    // Sorting logic
    let sortOption = {};
    if (sort === "lowToHigh") {
      sortOption["variants.discount_price"] = 1;
      sortOption["variants.price"] = 1;
    } else if (sort === "highToLow") {
      sortOption["variants.discount_price"] = -1;
      sortOption["variants.price"] = -1;
    } else if (sort === "aToZ") {
      sortOption["product_name"] = 1;
    } else if (sort === "zToA") {
      sortOption["product_name"] = -1;
    }

    //  Pagination setup
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);
    const skip = (page - 1) * limit;

    //  Fetch filtered products
    const products = await Product.find(query)
      .populate("category_id")
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean();

    //  Pick a variant to display
    products.forEach((p) => {
      if (p.variants && p.variants.length > 0) {
        p.randomVariant = p.variants.reduce((min, v) =>
          (v.discount_price || v.price) < (min.discount_price || min.price)
            ? v
            : min
        );
      }
    });
 const userData = req.session.user || null;
    // Render EJS
    res.render("shop", {
      products,
      categories,
      category,
      search,
      sort,
      currentPage: page,
      totalPages,
      minPrice,
      maxPrice,
      userData
    });
  } catch (error) {
    console.log("Error in loadShop:", error);
    res.redirect("/pageNotFound");
  }
};

module.exports = { loadShop };
