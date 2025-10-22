const cloudinary = require('../../config/cloudinary');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const fs = require('fs');

// Render Add Product Page
const addproduct = async (req, res) => {
  try {
    const categories = await Category.find({ isDeleted: { $ne: true } });
    res.render('addproduct', {
      categories,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error(err);
    res.render('addproduct', {
      categories: [],
      success: [],
      error: ['Something went wrong']
    });
  }
};

// Add Product POST
const addProductPost = async (req, res) => {
  try {
    let { name, description, category, variants } = req.body;
    variants = Array.isArray(variants) ? variants : [variants];
    const errors = [];

    // --- Product-level validation ---
    if (!name || name.trim().length < 3 || !/^[a-zA-Z0-9\s]+$/.test(name))
      errors.push('Invalid product name (min 3 characters, letters & numbers only)');
    if (!description || description.trim().length < 10)
      errors.push('Description must be at least 10 characters');
    if (!category)
      errors.push('Category is required');

    const processedVariants = [];

    for (let i = 0; i < variants.length; i++) {
      const { color, price, discountPrice, stock, size } = variants[i];
      const colorNormalized = color?.trim();
      const sizeNumber = Number(size);

      // --- Variant-level validation ---
      if (!colorNormalized || !/^[A-Za-z\s]+$/.test(colorNormalized))
        errors.push(`Variant ${i + 1}: Invalid color`);
      if (!price || Number(price) <= 0)
        errors.push(`Variant ${i + 1}: Price must be greater than 0`);
      if (discountPrice && (Number(discountPrice) < 0 || Number(discountPrice) > Number(price)))
        errors.push(`Variant ${i + 1}: Invalid discount price`);
      if (!stock || Number(stock) < 0)
        errors.push(`Variant ${i + 1}: Invalid stock`);
      if (!sizeNumber || isNaN(sizeNumber) || sizeNumber < 6 || sizeNumber > 10)
        errors.push(`Variant ${i + 1}: Size must be between 6–10`);

      if (errors.length) continue;

      // --- Upload cropped images (only if needed) ---
      let croppedImages = [];

      if (req.files && req.files['croppedImagesData']) {
        // check if same color variant already exists (to avoid duplicate image upload)
        let existingColor = false;

        if (name && category) {
          const existingProd = await Product.findOne({ product_name: name.trim(), category_id: category });
          if (existingProd) {
            existingColor = existingProd.variants.some(
              (variant) => variant.color.trim().toLowerCase() === colorNormalized.toLowerCase()
            );
          }
        }

        // Only upload if color is new
        if (!existingColor) {
          for (let file of req.files['croppedImagesData']) {
            const uploaded = await cloudinary.uploader.upload(file.path, { folder: 'products/cropped' });
            croppedImages.push(uploaded.secure_url);
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          }
        } else {
          console.log(`Skipped image upload — same color "${colorNormalized}" already exists.`);
        }
      }

      processedVariants.push({
        color: colorNormalized,
        price: Number(price),
        discount_price: discountPrice ? Number(discountPrice) : 0,
        sizes: [{ size: sizeNumber, stock: Number(stock) }],
        images: [...croppedImages],
        isListed: true
      });
    }

    // --- Validation errors ---
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    // --- Check if product exists ---
    let existingProduct = await Product.findOne({ product_name: name.trim(), category_id: category });

    if (existingProduct) {
      for (let v of processedVariants) {
        const existingVariant = existingProduct.variants.find(
          ev => ev.color.trim().toLowerCase() === v.color.trim().toLowerCase()
        );

        if (existingVariant) {
          const sameSize = existingVariant.sizes.find(s => s.size === v.sizes[0].size);

          if (sameSize) {
            return res.status(400).json({
              success: false,
              errors: [`Product with color "${v.color}" and size ${v.sizes[0].size} already exists!`]
            });
          } else {
            existingVariant.sizes.push(v.sizes[0]);
            // don’t add duplicate images again
            if (v.images.length > 0) {
              existingVariant.images.push(...v.images);
            }
            existingVariant.price = v.price;
            existingVariant.discount_price = v.discount_price;
          }
        } else {
          existingProduct.variants.push(v);
        }
      }

      await existingProduct.save();
      return res.json({ success: true, message: 'Existing product updated successfully!' });
    }

    // --- Create new product ---
    const newProduct = new Product({
      category_id: category,
      product_name: name.trim(),
      product_description: description,
      isListed: true,
      variants: processedVariants
    });

    await newProduct.save();
    return res.json({ success: true, message: 'New product added successfully!' });

  } catch (err) {
    console.error('❌ Error adding product:', err);
    return res.status(500).json({ success: false, errors: ['Something went wrong while adding the product.'] });
  }
};

module.exports = { addproduct, addProductPost };
