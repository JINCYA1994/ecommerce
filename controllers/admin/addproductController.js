const Product = require('../../models/productSchema');
const cloudinary = require('../../config/cloudinary');
const Category = require('../../models/categorySchema');
const fs = require('fs');


const getAddProduct = async (req, res) => {
  try {
    const categories = await Category.find({ isDeleted: { $ne: true } });
    res.render('addproduct', {
      categories,
      success: req.flash('success'),
      error: req.flash('error'),
    });
  } catch (err) {
    console.error('Error loading add product:', err);
    req.flash('error', 'Failed to load page');
    res.redirect('/admin/dashboard');
  }
};


const postAddProduct = async (req, res) => {
  try {
    const errors = [];
    const { name, description, category } = req.body;

 
if (
  !name ||
  !/^[A-Za-z][A-Za-z0-9\s,'\/-]*$/.test(name.trim()) ||  
  (name.match(/[A-Za-z]/g) || []).length < 3
) {
  errors.name = 'Invalid product name (must start with a letter, contain at least 3 letters, only letters, numbers, spaces, "-", ",", and "/" allowed)';
}


    if (!description || description.trim().length < 10)
      errors.push('Description must be at least 10 characters');
    if (!category)
      errors.push('Category is required');

    let variants = [];
    if (req.body.variants) {
      variants = Object.values(req.body.variants);
    }

    if (!variants.length) {
      errors.push('At least one variant is required.');
    } else {
      variants.forEach((v, i) => {
        if (!v.color || v.color.trim().length < 3) {
          errors.push(`Variant ${i + 1}: Color is required (min 3 chars).`);
        }
        if (!v.price || isNaN(v.price) || Number(v.price) <= 0) {
          errors.push(`Variant ${i + 1}: Price must be a positive number.`);
        }
        // if (v.discountPrice && Number(v.discountPrice) >= Number(v.price)) {
        //   errors.push(`Variant ${i + 1}: Discount must be less than price.`);
        // }
        if (!v.size || isNaN(v.size) || Number(v.size) <= 0) {
          errors.push(`Variant ${i + 1}: Invalid size.`);
        }
        if (!v.stock || isNaN(v.stock) || Number(v.stock) < 0||Number(v.stock)>100) {
          errors.push(`Variant ${i + 1}: 'Stock must be between 0 and 100'`);
        }
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
  success: false,
  message: errors.join(" | ")
});

    }

    const originalImages = req.files['originalImages'] || [];
    const croppedImages = req.files['croppedImagesData'] || [];

    const uploadToCloudinary = async (file) => {
      const uploaded = await cloudinary.uploader.upload(file.path, {
        folder: 'FootChic/Products',
      });
      fs.unlinkSync(file.path);
      return uploaded.secure_url;
    };

    const originalUrls = await Promise.all(originalImages.map(uploadToCloudinary));
    const croppedUrls = await Promise.all(croppedImages.map(uploadToCloudinary));

    // 🔹 Combine same color variants (from the same form)
    const tempVariants = {};
    variants.forEach((variant, index) => {
      const colorKey = variant.color.trim().toLowerCase();
      const start = index * 4;
      const end = start + 4;
      const images = croppedUrls.slice(start, end);

      const sizeObj = {
        size: Number(variant.size),
        stock: Number(variant.stock),
        isListed: true,
      };

      if (!tempVariants[colorKey]) {
        tempVariants[colorKey] = {
          color: variant.color.trim(),
          price: Number(variant.price),
          // discount_price: Number(variant.discountPrice),
          images,
          sizes: [sizeObj],
        };
      } else {
        // 🔹 If same color, just push size instead of new variant
        tempVariants[colorKey].sizes.push(sizeObj);
      }
    });

    const finalVariants = Object.values(tempVariants);

    // 🔹 Continue same DB logic
    let existingProduct = await Product.findOne({
      product_name: name.trim(),
      category_id: category,
    });

    if (existingProduct) {
      for (const newVariant of finalVariants) {
        let existingVariant = existingProduct.variants.find(
          (v) => v.color.toLowerCase() === newVariant.color.toLowerCase()
        );

        if (existingVariant) {
          for (const newSize of newVariant.sizes) {
            const existingSize = existingVariant.sizes.find(
              (s) => s.size === newSize.size
            );

            if (existingSize) {
              existingSize.stock += newSize.stock;
            } else {
              existingVariant.sizes.push({
                size: newSize.size,
                stock: newSize.stock,
                isListed: true,
                isDeleted: false,
              });
            }
          }
        } else {
          //  Add new color variant entirely
          existingProduct.variants.push(newVariant);
        }
      }
      await existingProduct.save();
      req.flash('success', 'Product variants updated successfully!');
    } else {
      const newProduct = new Product({
        category_id: category,
        product_name: name.trim(),
        product_description: description.trim(),
        variants: finalVariants,
      });
      await newProduct.save();
      req.flash('success', 'New product created successfully!');
    }

    res.redirect('/admin/products');
  } catch (err) {
    console.error('Error while adding product:', err);
    req.flash('error', 'Something went wrong while adding the product.');
    res.redirect('/admin/products/add');
  }
};

module.exports = {
  getAddProduct,
  postAddProduct,
};
