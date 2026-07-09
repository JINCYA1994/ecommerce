 const Category=require('../../models/categorySchema')
const Product = require('../../models/productSchema');
 const cloudinary = require('../../config/cloudinary');

const getProducts = async (req, res) => {
  try {
  //   let search = req.query.search || "";

   const search = (req.query.search || "")
  .trim()
  .replace(/\s+/g, " ");
    let page = parseInt(req.query.page) || 1;
    let limit = 10;
    let skip = (page - 1) * limit;

    let query = {  isDeleted: { $ne: true } };

   const message = req.session.message;

      req.session.message = null;
      if (search) {
  query.product_name = {
    $regex: search.split(" ").join(".*"),
    $options: "i"
  };
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
      error: req.flash("error"),message 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};




const updateLimit = async (req, res) => {
  try {
    const { productId, variantId, sizeId } = req.params;
    const { maxOrderQty } = req.body;
    const limit = Number(maxOrderQty);

    if (isNaN(limit) || limit < 1) {
      return res.json({
        success: false,
        message: "Limit must be at least 1"
      });
    }

    const product = await Product.findById(productId);
    if (!product) return res.json({ success: false });

    const variant = product.variants.id(variantId);
    if (!variant) return res.json({ success: false });

    const size = variant.sizes.id(sizeId);
    if (!size) return res.json({ success: false });

    // MAIN VALIDATION (after getting size)
    if (limit > size.stock) {
      return res.json({
        success: false,
        message: `Maximum order quantity cannot exceed stock (${size.stock})`
      });
    }
if (limit > size.stock) {
  size.maxOrderQty = size.stock; 
} else {
  size.maxOrderQty = limit;
}
    

    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: productId,
        "variants._id": variantId,
        "variants.sizes._id": sizeId
      },
      {
        $set: {
          "variants.$[variant].sizes.$[size].maxOrderQty": Number(maxOrderQty)
        }
      },
      {
        arrayFilters: [
          { "variant._id": variantId },
          { "size._id": sizeId }
        ],
        new: true
      }
    );

    if (!updatedProduct) {
      return res.json({ success: false, message: "Update failed" });
    }

    res.json({ success: true,message :'product updated' });

  } catch (error) {
    console.log("Update limit error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

//list products

const listProduct=async(req,res)=>{
  try{
    const{productId}=req.params
    await Product.updateOne({_id:productId},{$set:{isListed:true}})
       req.session.message = { type: 'success', text: 'Product listed successfully'}
    res.redirect('/admin/products')
  }catch(err){
    console.error(err)
    res.status(500).send('Server Error')
  }
}
//unlistproduct

const unlistProduct=async(req,res)=>{
  try{
    const{productId}=req.params
    await Product.updateOne({_id:productId},{$set:{isListed:false}})
    req.session.message = { type: 'success', text: 'Product unlisted successfully'}
    res.redirect('/admin/products')
  }catch(err){
    console.error(err)
    res.status(500).send('Server Error')
  }
}



//list variants

const listVariant=async (req,res) => {
  try {
    const {productId,variantId,sizeId}=req.params
     let page = parseInt(req.query.page) || 1
await Product.updateOne(
  {_id:productId },
 { $set: { "variants.$[v].sizes.$[s].isListed": true } },
  { arrayFilters: [{ "v._id": variantId }, { "s._id": sizeId }] }
);
req.session.message = { type: 'success', text: 'Variant listed successfully'}
    res.redirect(`/admin/products?page=${page || 1}`)
  } catch (err) {
    console.error(err)
    res.status(500).send('server Error')
  }
  
}


//unlist variants
const unlistVariant=async (req,res) => {
  try {
    const {productId,variantId,sizeId}=req.params
   let page = parseInt(req.query.page) || 1
await Product.updateOne(
  {_id:productId },
 { $set: { "variants.$[v].sizes.$[s].isListed": false } },
  { arrayFilters: [{ "v._id": variantId }, { "s._id": sizeId }] }
);

req.session.message = { type: 'success', text: 'Variant Unlisted successfully'}
    res.redirect(`/admin/products?page=${page || 1}`)
  } catch (err) {
    console.error(err)
    res.status(500).send('server Error')
  }
  
}



const deleteSize = async (req, res) => {
  try {
    const { productId, variantId, sizeId } = req.params;

    //  Soft delete size
    await Product.updateOne(
      { _id: productId },
      {
        $set: { "variants.$[v].sizes.$[s].isDeleted": true }
      },
      {
        arrayFilters: [
          { "v._id": variantId },
          { "s._id": sizeId }
        ]
      }
    );

    //  Get updated product
    const product = await Product.findById(productId);

    //  Check if ANY active size exists
    let hasActiveSize = false;

    product.variants.forEach(variant => {
      variant.sizes.forEach(size => {
        if (!size.isDeleted) {
          hasActiveSize = true;
        }
      });
    });

    // If NO active sizes → delete product
    if (!hasActiveSize) {
      await Product.findByIdAndUpdate(productId, {
        isDeleted: true
      });
    }

    res.redirect('/admin/products');

  } catch (err) {
    console.log(err.message);
    res.redirect('/admin/products');
  }
};






 module.exports = {getProducts,deleteSize,listVariant,unlistVariant,updateLimit,listProduct,unlistProduct }