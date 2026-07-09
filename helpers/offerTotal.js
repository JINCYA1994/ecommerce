const Offer = require("../models/offerSchema");

const getActiveOffers = async () => {
  return await Offer.find({
    isActive: true,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() }
  }).lean();
};

const getFinalPrice = (product, variant, offers) => {

  const productOffer = offers.find(
    o =>
      o.offerType === "PRODUCT" &&
      o.product_id?.toString() === product._id.toString()
  );

  const categoryOffer = offers.find(
    o =>
      o.offerType === "CATEGORY" &&
      o.category_id?.toString() === product.category_id.toString()
  );

  let discount = 0;

  if (productOffer && categoryOffer) {
    discount = Math.max(
      productOffer.discountPercentage,
      categoryOffer.discountPercentage
    );
  } else if (productOffer) {
    discount = productOffer.discountPercentage;
  } else if (categoryOffer) {
    discount = categoryOffer.discountPercentage;
  }

  const finalPrice =
    discount > 0
      ? Math.round(
          variant.price -
          (variant.price * discount) / 100
        )
      : variant.price;

  return {
    finalPrice,
    discount
  };
};

module.exports = {
  getFinalPrice,
  getActiveOffers
};