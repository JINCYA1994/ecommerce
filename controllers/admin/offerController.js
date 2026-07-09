const offer = require('../../models/offerSchema');
const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema');

const getOfferPage = async (req, res) => {
  try {


    const search = (req.query.search || "")
      .trim()
      .replace(/\s+/g, " ");
    let page = parseInt(req.query.page) || 1;
    let limit = 10;
    let skip = (page - 1) * limit;

    let query = {}


    if (search) {
      query.offerTitle = {
        $regex: search.split(" ").join(".*"),
        $options: "i"
      };
    }

    const totalOffers = await offer.countDocuments(query);
    const totalPages = Math.ceil(totalOffers / limit);

    const successMessage = req.session.successMessage;
    const errorMessage = req.session.errorMessage;

    req.session.successMessage = null;
    req.session.errorMessage = null;

    const offers = await offer.find(query).populate("product_id")
      .populate("category_id").sort({ created_At: -1 }).skip(skip)
      .limit(limit)
      .lean();

    const products = await Product.find({
      isListed: true,
      isDeleted: false
    });
    const categories = await Category.find({ isListed: true });
    res.render('offer', {
      offers, search,
      currentPage: page,
      totalPages, successMessage,
      errorMessage, products, categories
    });

  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
};

const createOffer = async (req, res) => {
  try {
    let {
      offerTitle,
      offerType,
      discountPercentage,
      startDate,
      endDate,
      isActive,
      product_id,
      category_id


    } = req.body;

    //  BASIC VALIDATION
    if (!offerTitle || offerTitle.trim().length < 3) {
      return res.json({ success: false, message: "Invalid offer Title" });
    }

    if (!offerType || !["PRODUCT", "CATEGORY"].includes(offerType)) {

      return res.json({
        success: false,
        message: "Invalid offer type"
      });
    }


    discountPercentage = Number(discountPercentage);


    if (isNaN(discountPercentage) || discountPercentage <= 0) {
      return res.json({ success: false, message: "Invalid discount Percentage" });
    }
    if (discountPercentage > 100) {
      return res.json({
        success: false,
        message: "Percentage cannot exceed 100%"
      });
    }
    if (offerType === "PRODUCT" && !product_id) {

      return res.json({
        success: false,
        message: "Please select a product"
      });
    }


    if (offerType === "CATEGORY" && !category_id) {

      return res.json({
        success: false,
        message: "Please select a category"
      });
    }

    //  DATE VALIDATION
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (!startDate || isNaN(start)) {
      return res.json({ success: false, message: "Invalid start date" });
    }

    if (!endDate || isNaN(end)) {
      return res.json({ success: false, message: "Invalid end date" });
    }

    if (start >= end) {
      return res.json({
        success: false,
        message: "End date must be after start date"
      });
    }



    const existingOffer = await offer.findOne({
      offerTitle: offerTitle.trim()
    });

    if (existingOffer) {

      return res.json({
        success: false,
        message: "Offer already exists"
      });
    }


    // ---------------- CREATE OFFER ----------------

    const newOffer = new offer({

      offerTitle: offerTitle.trim(),

      offerType,

      product_id:
        offerType === "PRODUCT"
          ? product_id
          : null,

      category_id:
        offerType === "CATEGORY"
          ? category_id
          : null,

      discountType: "percentage",

      discountPercentage,

      startDate,

      endDate,

      isActive
    });


    await newOffer.save();


    return res.json({
      success: true,
      message: "Offer created successfully"
    });

  } catch (error) {

    console.log(error);

    return res.json({
      success: false,
      message: "Server Error"
    });
  }
};

const deleteOffer = async (req, res) => {

  try {

    const offerId = req.params.id;
    if (!offerId) {
      return res.status(400).json({
        success: false,
        message: "Offer ID not found"
      });
    }
    await offer.findByIdAndDelete(offerId);
    req.session.successMessage = "Offer deleted successfully";
    return res.redirect("/admin/offers");

  } catch (error) {

    console.log(error);

    return res.redirect("/admin/offers");
  }
};


const updateOffer = async (req, res) => {

  try {

    const offerId = req.params.id;

    const {
      offerTitle,
      offerType,
      discountPercentage,
      startDate,
      endDate,
      isActive,
      product_id,
      category_id
    } = req.body;

    await offer.findByIdAndUpdate(offerId, {

      offerTitle,
      offerType,
      discountPercentage,
      startDate,
      endDate,
      isActive,

      product_id:
        offerType === "PRODUCT"
          ? product_id
          : null,

      category_id:
        offerType === "CATEGORY"
          ? category_id
          : null

    });

    return res.json({
      success: true,
      message: "Offer updated successfully"
    });

  } catch (error) {

    console.log(error);

    return res.json({
      success: false,
      message: "Server Error"
    });

  }

};


module.exports = { getOfferPage, createOffer, deleteOffer, updateOffer }