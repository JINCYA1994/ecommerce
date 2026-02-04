 const Category=require('../../models/categorySchema')
const Product = require('../../models/productSchema');
 const cloudinary = require('../../config/cloudinary');

const getProducts = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    let limit = 10;
    let skip = (page - 1) * limit;

    let query = { };

    if (search) {
      query.product_name = { $regex: search, $options: "i" };
    }

    const products = await Product.find(query)
      .populate("category_id")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    res.render("product", {
      products,
      search,
      currentPage: page,
      totalPages,
      success: req.flash("success"),
      error: req.flash("error")
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};







//list products

const listProduct=async (req,res) => {
  try {
    const {productId,variantId,sizeId}=req.params
     let page = parseInt(req.query.page) || 1
await Product.updateOne(
  {_id:productId },
 { $set: { "variants.$[v].sizes.$[s].isListed": true } },
  { arrayFilters: [{ "v._id": variantId }, { "s._id": sizeId }] }
);
    res.redirect(`/admin/products?page=${page || 1}`)
  } catch (err) {
    console.error(err)
    res.status(500).send('server Error')
  }
  
}


//unlist products
const unlistProduct=async (req,res) => {
  try {
    const {productId,variantId,sizeId}=req.params
   let page = parseInt(req.query.page) || 1
await Product.updateOne(
  {_id:productId },
 { $set: { "variants.$[v].sizes.$[s].isListed": false } },
  { arrayFilters: [{ "v._id": variantId }, { "s._id": sizeId }] }
);
    res.redirect(`/admin/products?page=${page || 1}`)
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
res.redirect(`/admin/products?page=${page || 1}`)
}
catch(err){
console.log(err.message)
res.redirect('/admin/products')
}
}







 module.exports = {getProducts,deleteSize,listProduct,unlistProduct}