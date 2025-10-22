 const Category=require('../../models/categorySchema')
const Product = require('../../models/productSchema');
 const cloudinary = require('../../config/cloudinary');

const getProducts=async(req,res)=>{
try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    let limit = 2;

   let query = { isDeleted: { $ne: true } };  

   if (search) {
      query.product_name  = { $regex: search, $options: "i" }; 
    }




const totalproducts = await Product.countDocuments(query);

 
   let products = await Product.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
       .populate('category_id').lean() ;

     console.log(products)  
// Filter deleted sizes
products.forEach(product => {
  product.variants.forEach(variant => {
    variant.sizes = variant.sizes.filter(size => !size.isDeleted);
  });
product.variants = product.variants.filter(variant => variant.sizes.length > 0);
});

products = products.filter(product => product.variants.length > 0);




    const totalPages = Math.ceil(totalproducts / limit);

    res.render('product', {
    products,
      search,
      currentPage: page,
      totalPages,
  success: req.flash('success'),
  error: req.flash('error')
    });
  } catch (err) {
    console.error("Error loading categories:", err);
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