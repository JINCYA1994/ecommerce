

const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Cart=require('../../models/cartSchema')
const Offer=require('../../models/offerSchema')
const loadShop = async (req, res) => {
  try {
    const category = req.query.category || "";
    const minPrice = parseInt(req.query.minPrice) || 0;
    const maxPrice = parseInt(req.query.maxPrice) || 10000;
    // const search = req.query.search || "";
    const search = (req.query.search || "")
  .trim()
  .replace(/\s+/g, " ");
    const sort = req.query.sort || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const cartMessage = req.session.cartMessage;
     req.session.cartMessage = null;
    // Fetch listed categories
    const categories = await Category.find({ isListed: true,isDeleted:false });

    let query = {
  isListed: true,

};
const offers = await Offer.find({
  isActive: true,
  startDate: { $lte: new Date() },
  endDate: { $gte: new Date() }
}).lean();
    // Category filter
    if (category) {
      const selectedCategory = await Category.findOne({
        _id: category,
        isListed: true,isDeleted:false
      });

      if (selectedCategory) {
        query.category_id = selectedCategory._id;
      } else {
        query.category_id = null;
      }
    } else {
      const listedCategoryIds = categories.map(cat => cat._id);
      query.category_id = { $in: listedCategoryIds };
    }

    // Search filter
   

    if (search) {
  query.product_name = {
    $regex: search.split(" ").join(".*"),
    $options: "i"
  };
}
    // Fetch products (NO price filter here)
    let products = await Product.find(query)
      .populate("category_id")
      .lean();
      
      products.forEach(p => {
  p.variants = p.variants.filter(v =>
    v.sizes.some(s => s.stock > 0 && s.isListed && !s.isDeleted)
  );
});
products.forEach(product => {

  product.variants.forEach(variant => {

    let productOffer = offers.find(
      o =>
        o.offerType === "PRODUCT" &&
        o.product_id?.toString() === product._id.toString()
    );

    let categoryOffer = offers.find(
      o =>
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

    variant.offerPercentage = discount;

    variant.finalPrice =
      discount > 0
        ? Math.round(
            variant.price -
            (variant.price * discount) / 100
          )
        : variant.price;
  });

});
    // Find lowest effective price variant
    products.forEach((p) => {
      if (p.variants && p.variants.length > 0) {
        p.randomVariant = p.variants.reduce((min, v) => {

          // const currentPrice =
          //   v.discount_price && v.discount_price > 0
          //     ? v.discount_price
          //     : v.price;

          // const minVariantPrice =
          //   min.discount_price && min.discount_price > 0
          //     ? min.discount_price
          //     : min.price;
          const currentPrice = v.finalPrice || v.price;

const minVariantPrice = min.finalPrice || min.price;

          return currentPrice < minVariantPrice ? v : min;
        });
      }
    });

    //  Price filtering AFTER calculating effective price
    let filteredProducts = products.filter((p) => {
      if (!p.randomVariant) return false;

      // const effectivePrice =
        // p.randomVariant.discount_price && p.randomVariant.discount_price > 0
// const effectivePrice =
  // p.randomVariant.finalPrice || p.randomVariant.price;
  //         ? p.randomVariant.discount_price
  //         : p.randomVariant.price;
const effectivePrice =
  p.randomVariant.finalPrice || p.randomVariant.price;
      return effectivePrice >= minPrice && effectivePrice <= maxPrice;
    });

    // Sorting
    if (sort === "aToZ") {
      filteredProducts.sort((a, b) =>
        a.product_name.localeCompare(b.product_name)
      );
    }

    if (sort === "zToA") {
      filteredProducts.sort((a, b) =>
        b.product_name.localeCompare(a.product_name)
      );
    }

    if (sort === "lowToHigh") {
      filteredProducts.sort((a, b) => {
        // const priceA =
        //   a.randomVariant.discount_price && a.randomVariant.discount_price > 0
        //     ? a.randomVariant.discount_price
        //     : a.randomVariant.price;

        // const priceB =
        //   b.randomVariant.discount_price && b.randomVariant.discount_price > 0
        //     ? b.randomVariant.discount_price
        //     : b.randomVariant.price;
const priceA =
  a.randomVariant.finalPrice || a.randomVariant.price;

const priceB =
  b.randomVariant.finalPrice || b.randomVariant.price;
        return priceA - priceB;
      });
    }

    if (sort === "highToLow") {
      filteredProducts.sort((a, b) => {
        // const priceA =
        //   a.randomVariant.discount_price && a.randomVariant.discount_price > 0
        //     ? a.randomVariant.discount_price
        //     : a.randomVariant.price;

        // const priceB =
        //   b.randomVariant.discount_price && b.randomVariant.discount_price > 0
        //     ? b.randomVariant.discount_price
        //     : b.randomVariant.price;
const priceA =
  a.randomVariant.finalPrice || a.randomVariant.price;

const priceB =
  b.randomVariant.finalPrice || b.randomVariant.price;
        return priceB - priceA;
      });
    }

    // Pagination
    const totalProducts = filteredProducts.length;
    const totalPages = Math.ceil(totalProducts / limit);
    const startIndex = (page - 1) * limit;
    const paginatedProducts = filteredProducts.slice(
      startIndex,
      startIndex + limit
    );

    const userData = req.session.user || null;

    res.render("shop", {
      products: paginatedProducts,
      categories,
      category,
      search,
      sort,
      currentPage: page,
      totalPages,
      minPrice,
      maxPrice,
      userData,
      cartMessage
    });

  } catch (error) {
    console.log("Error in loadShop:", error);
    res.redirect("/pageNotFound");
  }
};



const getVariantSizes = async (req, res) => {
  try {

    const { variantId } = req.params;

    const product = await Product.findOne({
      "variants._id": variantId
    });

    if (!product) {
      return res.status(404).json([]);
    }

    const variant = product.variants.id(variantId);

    if (!variant) {
      return res.status(404).json([]);
    }
const sizes = variant.sizes.filter(
  s => s.stock > 0 && s.isListed && !s.isDeleted
);
    res.json(sizes);

  } catch (error) {
    console.log(error);
    res.status(500).json([]);
  }
};








module.exports = { loadShop, getVariantSizes };
