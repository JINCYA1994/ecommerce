const { getFinalPrice, getActiveOffers } = require('./offerTotal');

const calculateCartTotal = async (cart, couponDiscount = 0) => {

  const offers = await getActiveOffers();

  let subtotal = 0;
 let offerDiscount = 0;
  for (const item of cart.items) {

    const product = item.product_id;
    if (!product) continue;

    const variant = product.variants.id(item.var_id);
    if (!variant) continue;

    const { finalPrice } =
      getFinalPrice(product, variant, offers);

    subtotal += finalPrice * item.quantity;
     offerDiscount += (variant.price - finalPrice)*item.quantity;

  }
  

  let shipping = subtotal > 2500 ? 0 : 50;

  const taxes = Math.round(subtotal * 0.03);
  const totalDiscount =offerDiscount +couponDiscount;
  const finalAmount =subtotal +shipping +taxes -couponDiscount;

  return {
    subtotal,
    shipping,
    taxes,
    finalAmount,
    couponDiscount,
    offerDiscount,
    totalDiscount,
  };
};

module.exports = calculateCartTotal;