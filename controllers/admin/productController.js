 const Category=require('../../models/categorySchema')
const Product = require('../../models/productSchema');
 const cloudinary = require('../../config/cloudinary');



const getProducts = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    let limit = 10; // fixed number of rows per page

    let query = { isDeleted: { $ne: true } };

    if (search) {
      query.product_name = { $regex: search, $options: "i" };
    }

    // Fetch products
    let allProducts = await Product.find(query)
      .populate('category_id')
      .sort({ createdAt: -1 })
      .lean();

    // Filter and flatten all variant-size combinations
    let allItems = [];
    allProducts.forEach(product => {
      product.variants.forEach(variant => {
        variant.sizes
          .filter(size => !size.isDeleted)
          .forEach(size => {
            allItems.push({
              product,
              variant,
              size
            });
          });
      });
    });

    // Total count for pagination
    const totalItems = allItems.length;
    const totalPages = Math.ceil(totalItems / limit);

    // Paginate manually
    const startIndex = (page - 1) * limit;
    const paginatedItems = allItems.slice(startIndex, startIndex + limit);

    res.render('product', {
      products: paginatedItems, // send flattened list
      search,
      currentPage: page,
      totalPages,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error("Error loading products:", err);
    res.status(500).send("Server Error");
  }
};





//list products

const listProduct=async (req,res) => {
  try {
    const {productId,variantId,sizeId}=req.params

await Product.updateOne(
  {_id:productId },
 { $set: { "variants.$[v].sizes.$[s].isListed": true } },
  { arrayFilters: [{ "v._id": variantId }, { "s._id": sizeId }] }
);
    res.redirect('/admin/products')
  } catch (err) {
    console.error(err)
    res.status(500).send('server Error')
  }
  
}


//unlist products
const unlistProduct=async (req,res) => {
  try {
    const {productId,variantId,sizeId}=req.params

await Product.updateOne(
  {_id:productId },
 { $set: { "variants.$[v].sizes.$[s].isListed": false } },
  { arrayFilters: [{ "v._id": variantId }, { "s._id": sizeId }] }
);
    res.redirect('/admin/products')
  } catch (err) {
    console.error(err)
    res.status(500).send('server Error')
  }
  
}


//delete

const deleteSize=async(req,res)=>{
  try{
  const { productId, variantId, sizeId } = req.params;  

await Product.updateOne(
  {_id:productId },
 { $set: { "variants.$[v].sizes.$[s].isDeleted": true } },
  { arrayFilters: [{ "v._id": variantId }, { "s._id": sizeId }] }
);

console.log("Size deleted successfully")
res.redirect('/admin/products')
}
catch(err){
console.log(err.message)
res.redirect('/admin/products')
}
}







 module.exports = {getProducts,deleteSize,listProduct,unlistProduct}