const OrderItem = require("../models/orderItemSchema");

const Product = require("../models/productSchema");

const { getFinalPrice } = require("./offerTotal");


const createOrderItems = async (

  newOrder,

  cart,

  subtotal,

  couponDiscount,

  taxes,

  offers

) => {

  const orderItemsData = [];

  // Prevent division by zero

  if (subtotal <= 0) {

    throw new Error("Invalid subtotal");

  }


  // Build item data + reduce stock

  for (let item of cart.items) {

    const product = await Product.findById(

      item.product_id._id

    );

    if (!product) {

      throw new Error(

        "Product not found"

      );

    }


    const variant = product.variants.id(

      item.var_id

    );

    if (!variant) {

      throw new Error(

        "Variant not found"

      );

    }


    const sizeObj = variant.sizes.find(

      s => s.size === item.size

    );


    if (

      !sizeObj ||

      sizeObj.stock < item.quantity

    ) {

      throw new Error(

        "Out of stock"

      );

    }


    // Reduce stock

    sizeObj.stock -= item.quantity;

    await product.save();


    const { finalPrice } =

      getFinalPrice(

        product,

        variant,

        offers

      );


    const itemSubtotal =

      finalPrice *

      item.quantity;


    orderItemsData.push({

      item,

      finalPrice,

      itemSubtotal

    });

  }


  // Coupon share

  let usedCoupon = 0;


  for (

    let i = 0;

    i < orderItemsData.length;

    i++

  ) {

    if (

      i ===

      orderItemsData.length - 1

    ) {

      orderItemsData[i]

      .couponShare =

      couponDiscount -

      usedCoupon;

    }

    else {

      const share = Math.round(

        (

          orderItemsData[i]

          .itemSubtotal /

          subtotal

        )

        *

        couponDiscount

      );


      orderItemsData[i]

      .couponShare =

      share;


      usedCoupon += share;

    }

  }


  // Tax share

  let usedTax = 0;


  for (

    let i = 0;

    i < orderItemsData.length;

    i++

  ) {

    if (

      i ===

      orderItemsData.length - 1

    ) {

      orderItemsData[i]

      .taxShare =

      taxes -

      usedTax;

    }

    else {

      const share = Math.round(

        (

          orderItemsData[i]

          .itemSubtotal /

          subtotal

        )

        *

        taxes

      );


      orderItemsData[i]

      .taxShare =

      share;


      usedTax += share;

    }

  }


  // Final amount

  for (let data of orderItemsData) {

    data.finalAmount = data.itemSubtotal - data.couponShare +data.taxShare;

  }


  // Create order items

  for ( let data of orderItemsData ) {

    await OrderItem.create({

      order_id:newOrder._id,
      
       product_id: data.item.product_id._id, 

      var_id:data.item.var_id,

      quantity:data.item.quantity,

      shipping:data.shipping,

      size: data.item.size,

      price: data.finalPrice,

      coupon_share:data.couponShare,

      tax_share:data.taxShare,

      final_amount:data.finalAmount

    });

  }


  return orderItemsData;

};


module.exports = createOrderItems;