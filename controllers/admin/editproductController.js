const cloudinary = require('../../config/cloudinary');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const fs = require('fs');

const getEditProduct=async(req,res)=>{

    try{
 const {productId,variantId,sizeId}=req.params
 const product=await Product.findById(productId).lean()
 const categories=await Category.find({}).lean()
if(!product){
    res.flash('error','Product not found')
    return res.redirect('/admin/products')
}
const variant=product.variants.find(v=>v._id.toString()===variantId)
if(!variant){
    res.flash('error','Variant not found')
    return res.redirect('/admin/products')
}
const size=variant.sizes.find(s=>s._id.toString()===sizeId)
if(!size){
    res.flash('error','Size not found')
   return  res.redirect('/admin/products')
}

res.render('editproduct',{
    product,variant,size,categories,success: req.flash('success'), error: req.flash('error')
})

}
    catch(err){
console.log(err,err.message)
    }
}




const updateProduct = async (req, res) => {
  try {
    const { productId, variantId, sizeId } = req.params;
    const { product_name, product_description, category, color, price, discount_price, size, stock } = req.body;
console.log(req.body)
console.log(req.files)
    const errors = {}; 

 
    if (!product_name || product_name.trim().length < 3) 
      {
      errors.product_name = 'Product name must be at least 3 characters';
    } 
    else if (!/^[a-zA-Z0-9\s]+$/.test(product_name.trim())) 
      {
      errors.product_name = 'Product name must not contain special characters';
    }

    if (!product_description || product_description.trim().length < 10) {
      errors.product_description = 'Description must be at least 10 characters';
    }

    if (!category) {
      errors.category = 'Please select a category';
    }

    if (!color || !/^[A-Za-z\s]+$/.test(color.trim())) {
      errors.color = 'Invalid color';
    }

    if (!price || Number(price) <= 0) {
      errors.price = 'Price must be greater than 0';
    }

    if (discount_price && (Number(discount_price) < 0 || Number(discount_price) > Number(price))) {
      errors.discount_price = 'Invalid discount price';
    }

    const sizeNumber = Number(size);
    if (!size || isNaN(sizeNumber) || sizeNumber < 6 || sizeNumber > 10) {
      errors.size = 'Size must be between 6-10';
    }

    if (!stock || Number(stock) < 0) {
      errors.stock = 'Invalid stock';
    }

    if (!req.files || Object.keys(req.files).length < 2) {
      errors.images = 'Please upload at least 4 images';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors }); 
      
    }

    
    const product = await Product.findById(productId);
    if (!product){
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({ success: false, message: 'Variant not found' });
    }

    const sizeObj = variant.sizes.id(sizeId);
    if (!sizeObj) return res.status(404).json({ success: false, message: 'Size not found' });


    product.product_name = product_name.trim();
    product.product_description = product_description.trim();
    product.category_id = category;
    variant.color = color.trim();
    variant.price = Number(price);
    variant.discount_price = discount_price ? Number(discount_price) : 0;
    sizeObj.size = sizeNumber;
    sizeObj.stock = Number(stock);


    const croppedImages = [];
     console.log(req.files)

    if (req.files) {
     
      if (req.files['originalImages']) {
        for (let file of req.files['originalImages']) {
          const uploaded = await cloudinary.uploader.upload(file.path, { folder: 'products/original' });
         
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        }
      }

     
      if (req.files['croppedImagesData']) {
        for (let file of req.files['croppedImagesData']) {
          const uploaded = await cloudinary.uploader.upload(file.path, { folder: 'products/cropped' });
          croppedImages.push(uploaded.secure_url);
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        }
      }
    }

    if (croppedImages.length > 0) {
      variant.images = croppedImages; 
    }

    await product.save();
   console.log(product)
    return res.json({ success: true, message: 'Product updated successfully!' }); 

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Something went wrong while updating the product.' });
  }
};












module.exports={getEditProduct,updateProduct}