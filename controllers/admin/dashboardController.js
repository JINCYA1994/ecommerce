const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const Product = require('../../models/productSchema');
const Order = require('../../models/orderSchema');
const Cart = require('../../models/cartSchema');
const OrderItem = require('../../models/orderItemSchema');
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require('../../models/paymentSchema');
const Coupon = require('../../models/couponSchema');
const calculateCartTotal = require('../../helpers/calculateTotal');
const { getActiveOffers, getFinalPrice } = require('../../helpers/offerTotal');
const createOrderItems =require('../../helpers/createOrderItems');
const moment = require("moment");



const getDateRange = (filter, startDate, endDate) => {

    const today = new Date();

    let start;
    let end;

    switch(filter){

        case "daily":

            start = new Date(today);
            start.setHours(0,0,0,0);

            end = new Date(today);
            end.setHours(23,59,59,999);

            break;

        case "weekly":

            start = new Date(today);
            start.setDate(today.getDate()-6);
            start.setHours(0,0,0,0);

            end = new Date();
            end.setHours(23,59,59,999);

            break;

        case "monthly":

            start = new Date(today.getFullYear(),today.getMonth(),1);

            end = new Date(today.getFullYear(),today.getMonth()+1,0,23,59,59,999);

            break;

        case "yearly":

            start = new Date(today.getFullYear(),0,1);

            end = new Date(today.getFullYear(),11,31,23,59,59,999);

            break;

        case "custom":

            start = new Date(startDate);

            end = new Date(endDate);

            start.setHours(0,0,0,0);

            end.setHours(23,59,59,999);

            break;

        default:

            start = new Date(today.getFullYear(),today.getMonth(),1);

            end = new Date(today.getFullYear(),today.getMonth()+1,0,23,59,59,999);

    }

    return {start,end};

}


const loadDashboard = async(req,res)=>{

try{

const {filter="monthly",startDate,endDate}=req.query;

const {start,end}=getDateRange(filter,startDate,endDate);
const paidOrders = await Payment.find({
    status:"Success"
}).select("_id");

const paymentIds = paidOrders.map(item=>item._id);
let groupId;

switch(filter){

case "daily":

case "custom":

groupId={
$dateToString:{
format:"%Y-%m-%d",
date:"$createdAt"
}
};

break;

case "weekly":

groupId={
$week:"$createdAt"
};

break;

case "monthly":

groupId={
$month:"$createdAt"
};

break;

case "yearly":

groupId={
$month:"$createdAt"
};

break;

}
const salesAgg=await Order.aggregate([

{
$match:{
payment_id:{
$in:paymentIds
},
createdAt:{
$gte:start,
$lte:end
}
}
},

{
$group:{
_id:groupId,
totalSales:{
$sum:"$total_price"
}
}
},

{
$sort:{
_id:1
}
}

]);
let labels=[];

let salesData=[];
labels=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

salesData=new Array(12).fill(0);

salesAgg.forEach(item=>{

salesData[item._id-1]=item.totalSales;

});
const topProducts=await OrderItem.aggregate([

{
$lookup:{
from:"orders",
localField:"order_id",
foreignField:"_id",
as:"order"
}
},

{$unwind:"$order"},

{
$match:{
"order.payment_id":{
$in:paymentIds
}
}
},

{
$lookup:{
from:"products",
localField:"var_id",
foreignField:"variants._id",
as:"product"
}
},

{$unwind:"$product"},

{
$group:{

_id:"$product._id",

product_name:{
$first:"$product.product_name"
},

totalSold:{
$sum:"$quantity"
}

}

},

{
$sort:{
totalSold:-1
}
},

{
$limit:5
}

]);
const topCategories=await OrderItem.aggregate([

{
$lookup:{
from:"products",
localField:"var_id",
foreignField:"variants._id",
as:"product"
}
},

{$unwind:"$product"},

{
$lookup:{
from:"categories",
localField:"product.category_id",
foreignField:"_id",
as:"category"
}
},

{$unwind:"$category"},

{
$group:{

_id:"$category._id",

category_name:{
$first:"$category.name"
},

totalSold:{
$sum:"$quantity"
}

}

},

{
$sort:{
totalSold:-1
}
},

{
$limit:5
}

]);
res.render("dashboard",{

filter,

topProducts,

topCategories,

salesData,

labels,

startDate:moment(start).format("YYYY-MM-DD"),

endDate:moment(end).format("YYYY-MM-DD")

});

// }catch(error){

// console.log(error);

// res.redirect("/admin");

// }
}
catch (error) {
  console.error(error);
  return res.status(500).send(error.stack);
}

}


const getDashboardData = async (req, res) => {
  try {

    const {
      filter = "monthly",
      startDate,
      endDate
    } = req.query;

    const { start, end } = getDateRange(
      filter,
      startDate,
      endDate
    );

    // Success Payments
    const payments = await Payment.find({
      status: "Success"
    }).select("_id");

    const paymentIds = payments.map(payment => payment._id);

    let groupId;

    switch (filter) {

      case "daily":
      case "custom":
        groupId = {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt"
          }
        };
        break;

      case "weekly":
        groupId = {
          week: { $week: "$createdAt" },
          year: { $year: "$createdAt" }
        };
        break;

      case "monthly":
        groupId = {
          $month: "$createdAt"
        };
        break;

      case "yearly":
        groupId = {
          $month: "$createdAt"
        };
        break;

      default:
        groupId = {
          $month: "$createdAt"
        };

    }

    // ================= SALES CHART =================

    const salesAgg = await Order.aggregate([

      {
        $match: {
          payment_id: {
            $in: paymentIds
          },
          createdAt: {
            $gte: start,
            $lte: end
          }
        }
      },

      {
        $group: {
          _id: groupId,
          totalSales: {
            $sum: "$total_price"
          }
        }
      },

      {
        $sort: {
          _id: 1
        }
      }

    ]);

    let labels = [];
    let salesData = [];

    if (filter === "daily" || filter === "custom") {

      let current = new Date(start);

      while (current <= end) {

        const date = moment(current).format("YYYY-MM-DD");

        labels.push(date);

        const item = salesAgg.find(s => s._id === date);

        salesData.push(item ? item.totalSales : 0);

        current.setDate(current.getDate() + 1);

      }

    } else if (filter === "weekly") {

      labels = salesAgg.map(item =>
        `Week ${item._id.week} - ${item._id.year}`
      );

      salesData = salesAgg.map(item => item.totalSales);

    } else {

      labels = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];

      salesData = new Array(12).fill(0);

      salesAgg.forEach(item => {
        salesData[item._id - 1] = item.totalSales;
      });

    }

    // ================= TOP PRODUCTS =================

    const topProducts = await OrderItem.aggregate([

      {
        $lookup: {
          from: "orders",
          localField: "order_id",
          foreignField: "_id",
          as: "order"
        }
      },

      {
        $unwind: "$order"
      },

      {
        $match: {
          "order.payment_id": {
            $in: paymentIds
          },
          status: {
            $nin: [
              "Cancelled",
              "Returned",
              "Return Requested"
            ]
          }
        }
      },

      {
        $lookup: {
          from: "products",
          localField: "var_id",
          foreignField: "variants._id",
          as: "product"
        }
      },

      {
        $unwind: "$product"
      },

      {
        $group: {

          _id: "$product._id",

          product_name: {
            $first: "$product.product_name"
          },

          totalSold: {
            $sum: "$quantity"
          }

        }
      },

      {
        $sort: {
          totalSold: -1
        }
      },

      {
        $limit: 5
      }

    ]);

    // ================= TOP CATEGORIES =================

    const topCategories = await OrderItem.aggregate([

      {
        $lookup: {
          from: "orders",
          localField: "order_id",
          foreignField: "_id",
          as: "order"
        }
      },

      {
        $unwind: "$order"
      },

      {
        $match: {
          "order.payment_id": {
            $in: paymentIds
          },
          status: {
            $nin: [
              "Cancelled",
              "Returned",
              "Return Requested"
            ]
          }
        }
      },

      {
        $lookup: {
          from: "products",
          localField: "var_id",
          foreignField: "variants._id",
          as: "product"
        }
      },

      {
        $unwind: "$product"
      },

      {
        $lookup: {
          from: "categories",
          localField: "product.category_id",
          foreignField: "_id",
          as: "category"
        }
      },

      {
        $unwind: "$category"
      },

      {
        $group: {

          _id: "$category._id",

          category_name: {
            $first: "$category.name"
          },

          totalSold: {
            $sum: "$quantity"
          }

        }
      },

      {
        $sort: {
          totalSold: -1
        }
      },

      {
        $limit: 5
      }

    ]);

    return res.json({

      labels,
      salesData,
      topProducts,
      topCategories

    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });

  }
};
module.exports={getDashboardData,loadDashboard }