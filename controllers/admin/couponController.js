
const Coupon = require('../../models/couponSchema');
 const User=require('../../models/userSchema')

const getCoupons = async (req, res) => {
  try {


   const search = (req.query.search || "")
  .trim()
  .replace(/\s+/g, " ");
    let page = parseInt(req.query.page) || 1;
    let limit = 10;
    let skip = (page - 1) * limit;

    let query = {}


      if (search) {
  query.code = {
    $regex: search.split(" ").join(".*"),
    $options: "i"
  };
      }

 const totalCoupons = await Coupon.countDocuments(query);
    const totalPages = Math.ceil(totalCoupons / limit);

      const successMessage = req.session.successMessage;
  const errorMessage = req.session.errorMessage;

  req.session.successMessage = null;
  req.session.errorMessage = null;

    const coupons = await Coupon.find(query).sort({ createdAt: -1 }) .skip(skip)
        .limit(limit)
        .lean();

    res.render('coupon', { coupons , search,
      currentPage: page,
      totalPages,  successMessage,
    errorMessage});

  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
};




const createCoupon = async (req, res) => {
  try {
    let {
      code,
      discount_type,
      discount_value,
      min_purchase,
      max_discount,
      start_date,
      end_date,
     usageLimit,
      isActive,
    
    } = req.body;
const exists = await Coupon.findOne({ code:{ $regex: `^${code}$`, $options: 'i' } });
    //  BASIC VALIDATION
    if (!code || code.trim().length < 3) {
      return res.json({ success: false, message: "Invalid coupon code" });
    }

    if (exists) {
     
     return res.json({ success: false, message: " Coupon code already exists" });
   
    } 
    if (!["percentage", "flat"].includes(discount_type)) {
      return res.json({ success: false, message: "Invalid discount type" });
    }

    discount_value = Number(discount_value);
    min_purchase = Number(min_purchase);
    max_discount = max_discount ? Number(max_discount) : null;
    usageLimit = Number(usageLimit) || 1;

    if (isNaN(discount_value) || discount_value <= 0) {
      return res.json({ success: false, message: "Invalid discount value" });
    }

    if (isNaN(min_purchase) || min_purchase <= 0) {
      return res.json({ success: false, message: "Invalid minimum purchase" });
    }

    //  TYPE BASED VALIDATION

    if (discount_type === "percentage") {

      if (discount_value > 100) {
        return res.json({
          success: false,
          message: "Percentage cannot exceed 100"
        });
      }

      if (!max_discount || max_discount <= 0) {
        return res.json({
          success: false,
          message: "Max discount required for percentage"
        });
      }

    } else if (discount_type === "flat") {

      if (discount_value >= min_purchase) {
        return res.json({
          success: false,
          message: "Flat discount must be less than minimum purchase"
        });
      }

    }

    //  DATE VALIDATION
    const start = new Date(start_date);
    const end = new Date(end_date);

    if (!start_date || isNaN(start)) {
      return res.json({ success: false, message: "Invalid start date" });
    }

    if (!end_date || isNaN(end)) {
      return res.json({ success: false, message: "Invalid end date" });
    }

    if (start >= end) {
      return res.json({
        success: false,
        message: "End date must be after start date"
      });
    }

    //  USAGE LIMIT
    if (usageLimit < 1) {
      return res.json({
        success: false,
        message: "Usage limit must be at least 1"
      });
    }

    //  DUPLICATE CHECK
    const existing = await Coupon.findOne({
      code: code.trim().toUpperCase()
    });

    if (existing) {
      return res.json({
        success: false,
        message: "Coupon already exists"
      });
    }

    //  CREATE
    const newCoupon = new Coupon({
      code: code.trim().toUpperCase(),
      discount_type,
      discount_value: Number(discount_value.toFixed(2)),
      min_purchase: Number(min_purchase.toFixed(2)),
      max_discount: max_discount ? Number(max_discount.toFixed(2)) : null,
      start_date,
      end_date,
       usageLimit: usageLimit || 1,
      isActive: isActive ,
      usedCount: 0
    });

    await newCoupon.save();

    return res.json({
      success: true,
      message: "Coupon created successfully"
    });

  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: "Server error"
    });
  }
};

const deleteCoupon = async (req, res) => {
  try {

    const couponId = req.params.id;

    if (!couponId) {
      return res.status(400).json({
        success: false,
        message: "Coupon ID not found"
      });
    }

    // DELETE coupon
    await Coupon.findByIdAndDelete(couponId);
  req.session.successMessage = "Coupon deleted successfully";
    return res.redirect("/admin/coupons");

  } catch (error) {
    console.log("Delete Coupon Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};

const updateCoupon = async (req, res) => {

  try {

    const { id } = req.params;

    const {
      code,
      discount_type,
      discount_value,
      min_purchase,
      max_discount,
      start_date,
      end_date,
      usageLimit,
      isActive
    } = req.body;

    await Coupon.findByIdAndUpdate(id, {

      code,
      discount_type,
      discount_value,
      min_purchase,
      max_discount,
      start_date,
      end_date,
      usageLimit,
      isActive

    });

    res.json({
      success: true,
      message: "Coupon updated successfully"
    });

  } catch (error) {

    console.log(error);

    res.json({
      success: false,
      message: "Something went wrong"
    });

  }

};




module.exports={getCoupons,createCoupon,deleteCoupon,updateCoupon}