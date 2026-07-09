const cloudinary = require('../../config/cloudinary');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const fs = require('fs');

const getEditProduct = async (req, res) => {

  try {
    const { productId, variantId, sizeId } = req.params
    const product = await Product.findById(productId).lean()
    const categories = await Category.find({}).lean()
    if (!product) {
      req.flash('error', 'Product not found')
      return res.redirect('/admin/products')
    }
    const variant = product.variants.find(v => v._id.toString() === variantId)
    if (!variant) {
      req.flash('error', 'Variant not found')
      return res.redirect('/admin/products')
    }
    const size = variant.sizes.find(s => s._id.toString() === sizeId)
    if (!size) {
      req.flash('error', 'Size not found')
      return res.redirect('/admin/products')
    }

    res.render('editproduct', {
      product, variant, size, categories, success: req.flash('success'), error: req.flash('error')
    })

  }
  catch (err) {
    console.log(err, err.message)
  }
}




const updateProduct = async (req, res) => {
  try {
    const { productId, variantId, sizeId } = req.params;
    const { product_name, product_description, category, color, price,  size, stock } = req.body;

    console.log("Update Body:", req.body);
    if (req.files) console.log("Update Files:", Object.keys(req.files));

    const errors = {};

    // Handle case where croppedIndex might be missing or single value
    const replacedIndexes = req.body.croppedIndex
      ? [].concat(req.body.croppedIndex).map(Number)
      : [];

    if (
      !product_name ||
      !/^[A-Za-z][A-Za-z0-9\s,'/-]*$/.test(product_name.trim()) ||
      (product_name.match(/[A-Za-z]/g) || []).length < 3
    ) {
      errors.product_name = "Invalid product name (must start with a letter, contain at least 3 letters, and only letters, numbers, spaces, ', -, / allowed)";
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

    // if (discount_price && (Number(discount_price) < 0 || Number(discount_price) > Number(price))) {
    //   errors.discount_price = 'Invalid discount price';
    // }

    const sizeNumber = Number(size);
    if (!size || isNaN(sizeNumber) || sizeNumber < 6 || sizeNumber > 10) {
      errors.size = 'Size must be between 6-10';
    }

    if (stock === undefined || stock === null || isNaN(Number(stock)) || Number(stock) < 0 || Number(stock) > 100) {
      errors.stock = 'Stock must be between 0 and 100';
    }

    //  Corrected image validation
    if (replacedIndexes.length > 0) {
      const imageCount = req.files?.croppedImagesData?.length || 0;

      if (imageCount === 0) {
        errors.images = "Please upload image";
      }

    if (imageCount > replacedIndexes.length) {
  errors.images = "Image index mismatch";
}

    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ success: false, message: 'Variant not found' });





    const existingImages = variant.images || [];
const validExistingImages = existingImages.filter(img => img && img.trim() !== "");

const newImageCount = req.files?.croppedImagesData?.length || 0;

const totalImages = validExistingImages.length + newImageCount;

if (totalImages < 4) {
  return res.status(400).json({
    success: false,
    errors: { images: "Minimum 4 images required" }
  });
}

    const sizeObj = variant.sizes.id(sizeId);
    if (!sizeObj) return res.status(404).json({ success: false, message: 'Size not found' });

    // --- Update basic fields ---
    product.product_name = product_name.trim();
    product.product_description = product_description.trim();
    product.category_id = category;
    variant.color = color.trim();
    variant.price = Number(price);
    // variant.discount_price = discount_price ? Number(discount_price) : 0;
    sizeObj.size = Number(size);
    sizeObj.stock = Number(stock);

    // --- Handle images ---
    const croppedImages = [];

    // Upload cropped images
    if (req.files && req.files['croppedImagesData']) {

      for (let file of req.files['croppedImagesData']) {
        const uploaded = await cloudinary.uploader.upload(file.path, { folder: 'products/cropped' });
        croppedImages.push(uploaded.secure_url);

        try {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch (unlinkErr) {
          console.error("Error deleting temp file:", unlinkErr);
        }
      }
    }

    // --- Keep existing images, replace only edited ones ---
  if (croppedImages.length > 0) {

  croppedImages.forEach((img, idx) => {
    const indexToReplace = replacedIndexes[idx];

    if (typeof indexToReplace !== 'number' || isNaN(indexToReplace)) {
      console.error(`Invalid indexToReplace at position ${idx}:`, indexToReplace);
      return;
    }

    variant.images[indexToReplace] = img;
  });
product.markModified("variants");
}


    await product.save();

    return res.json({ success: true, message: 'Product updated successfully!' });

  } catch (err) {
    console.error("Update Product Error:", err);
    return res.status(500).json({ success: false, message: `Update failed: ${err.message}` });
  }
};




const deleteVariantImage = async (req, res) => {
  try {
    const { productId, variantId, index } = req.params;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ success: false, message: "Variant not found" });

    if (!variant.images || !variant.images[index]) {
      return res.status(404).json({ success: false, message: "Image not found" });
    }

    variant.images[index] = "";

    await product.save();

    return res.json({ success: true, message: "Image deleted successfully" });

  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Server error while deleting image" });
  }
};

module.exports = { getEditProduct, updateProduct, deleteVariantImage }
