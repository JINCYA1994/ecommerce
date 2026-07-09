const offer= require('../../models/offerSchema');
const User=require('../../models/userSchema')
const Category=require('../../models/categorySchema')
const Product = require('../../models/productSchema');
const Order = require("../../models/orderSchema");
const PDFDocument=require("pdfkit");
const ExcelJS = require("exceljs");
const Payment = require("../../models/paymentSchema");
const getQuery = require("../../helpers/salesReport");
const OrderItem = require("../../models/orderItemSchema");

const loadSalesReport = async (req, res) => {

  try {

    const filter = req.query.filter || "day";

    const startDate = req.query.startDate;

    const endDate = req.query.endDate;

    const query = getQuery(
      filter,
      startDate,
      endDate
    );

    const orders = await Order.find(query)
      .populate("user_id")
      .sort({ ordered_at: -1 });


    // SUMMARY

    const overallSalesCount =
      orders.length;


    const overallOrderAmount =
      orders.reduce(
        (acc, order) =>
          acc + order.subtotal,
        0
      );


    const couponDeduction =
      orders.reduce(
        (acc, order) =>
          acc + order.coupon_discount,
        0
      );


    const overallDiscount =
      orders.reduce(
        (acc, order) =>
          acc +
          order.offer_discount +
          order.coupon_discount,
        0
      );


    const overallSales =
      orders.reduce(
        (acc, order) =>
          acc + order.total_price,
        0
      );


    res.render(
      "salesReport",
      {
        orders,

        filter,

        overallSalesCount,

        overallOrderAmount,

        overallSales,

        couponDeduction,

        overallDiscount
      }
    );

  }

  catch (error) {

    console.log(error);

    res.redirect("/admin");

  }

};


// const getSalesReportData = async (req, res) => {

// try {

// const page = parseInt(req.query.page) || 1;

// const limit = 10;

// const skip = (page - 1) * limit;

// const filter = req.query.filter || "day";

// const startDate = req.query.startDate;

// const endDate = req.query.endDate;


// const query = getQuery(

// filter,

// startDate,

// endDate

// );


// // Total orders count

// const totalOrders = await Order.countDocuments(query);


// // Pagination orders 

// const orders = await Order.find(query)

// .populate(

// "user_id",

// "username"

// )

// .populate(

// "payment_id",

// "payment_method"

// )

// .sort({

// ordered_at: -1

// })

// .skip(skip)

// .limit(limit);


// // ALL orders (SUMMARY)

// const allOrders = await Order.find(query);


// // Discounts

// const offerDiscount = allOrders.reduce(

// (acc, order) =>

// acc + (order.offer_discount || 0),

// 0

// );

// const grossSales = allOrders.reduce(
//   (sum, order) => sum + (order.subtotal || 0),
//   0
// );


// const totalCoupon = allOrders.reduce(

// (acc, order) =>

// acc + (order.coupon_discount || 0),

// 0

// );


// const totalDiscount = allOrders.reduce(

// (acc, order) =>

// acc +

// (order.offer_discount || 0) +

// (order.coupon_discount || 0),

// 0

// );


// // SUMMARY VARIABLES

// let deliveredSales = 0;

// let totalRefund = 0;

// let cancelledAmount = 0;

// let returnedAmount = 0;



// for (const order of allOrders) {

// const items = await OrderItem.find({

// order_id: order._id

// });


// items.forEach(item => {

// const amount =item.price * item.quantity;


// if (item.status === "Delivered") {

// deliveredSales += amount;

// }


// if (item.status === "Cancelled") {
//   cancelledAmount += amount;
//   totalRefund += amount;

// }


// if (item.status === "Returned") {

// returnedAmount += amount;

// totalRefund += amount;

// }

// });

// }


// const updatedOrders = [];


// for (const order of orders) {

// const items = await OrderItem.find({order_id: order._id});


// let refund = 0;

// let deliveredCount = 0;

// let cancelledCount = 0;

// let returnedCount = 0;


// items.forEach(item => {

// const amount =item.price * item.quantity;


// if (item.status === "Delivered") {

// deliveredCount++;

// }


// if (item.status === "Cancelled") {

// cancelledCount++;

// refund += amount;

// }


// if (item.status === "Returned") {

// returnedCount++;

// refund += amount;

// }

// });


// updatedOrders.push({

// ...order._doc,

// deliveredCount,

// cancelledCount,

// returnedCount,

// refund

// });

// }


// // SUMMARY



// const revenue = deliveredSales;



// const summary = {

// totalOrders,



// totalCouponDiscount:

// totalCoupon,

// totalDiscount,

//  grossSales,

//   revenue,

// offerDiscount,

// cancelledAmount,

// returnedAmount,

// refundAmount:

// totalRefund

// };


// // RESPONSE

// res.json({

// success: true,

// orders: updatedOrders,

// summary,

// currentPage: page,

// totalPages: Math.ceil(

// totalOrders / limit

// )

// });

// }

// catch (error) {

// console.log(

// "Sales Report Error:",

// error

// );


// res.status(500).json({

// success: false

// });

// }

// };

const getSalesReportData = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const filter = req.query.filter || "day";
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const query = getQuery(filter, startDate, endDate);

    // Total Orders
    const totalOrders = await Order.countDocuments(query);

    // Orders (Pagination)
    const orders = await Order.find(query)
      .populate("user_id", "username")
      .populate("payment_id", "payment_method")
      .sort({ ordered_at: -1 })
      .skip(skip)
      .limit(limit);

    // All Orders (Summary)
    const allOrders = await Order.find(query);

    // Discounts
    const offerDiscount = allOrders.reduce(
      (sum, order) => sum + (order.offer_discount || 0),
      0
    );

    const grossSales = allOrders.reduce(
      (sum, order) => sum + (order.subtotal || 0),
      0
    );

    const totalCoupon = allOrders.reduce(
      (sum, order) => sum + (order.coupon_discount || 0),
      0
    );

    const totalDiscount = allOrders.reduce(
      (sum, order) =>
        sum +
        (order.offer_discount || 0) +
        (order.coupon_discount || 0),
      0
    );

    let deliveredSales = 0;
    let totalRefund = 0;
    let cancelledAmount = 0;
    let returnedAmount = 0;

    for (const order of allOrders) {

      const items = await OrderItem.find({
        order_id: order._id
      });

      for (const item of items) {

        const amount = item.price * item.quantity;

        if (item.status === "Delivered") {

          deliveredSales += item.final_amount;

        }

        else if (item.status === "Cancelled") {

          cancelledAmount += amount;
          totalRefund += item.refund_amount || 0;

        }

        else if (item.status === "Returned") {

          returnedAmount += amount;
          totalRefund += item.refund_amount || 0;

        }

      }

    }

    const updatedOrders = [];

    for (const order of orders) {

      const items = await OrderItem.find({
        order_id: order._id
      });

      let refund = 0;
      let deliveredCount = 0;
      let cancelledCount = 0;
      let returnedCount = 0;

      for (const item of items) {

        if (item.status === "Delivered") {

          deliveredCount++;

        }

        else if (item.status === "Cancelled") {

          cancelledCount++;
          refund += item.refund_amount || 0;

        }

        else if (item.status === "Returned") {

          returnedCount++;
          refund += item.refund_amount || 0;

        }

      }

      updatedOrders.push({

        ...order._doc,

        deliveredCount,
        cancelledCount,
        returnedCount,
        refund

      });

    }

   const summary = {

      totalOrders,

      grossSales,

      revenue: deliveredSales,

      offerDiscount,

      totalCouponDiscount: totalCoupon,

      totalDiscount,

      cancelledAmount,

      returnedAmount,

      refundAmount: totalRefund

    };

    res.json({

      success: true,

      orders: updatedOrders,

      summary,

      currentPage: page,

      totalPages: Math.ceil(totalOrders / limit)

    });

  }

  catch (error) {

    console.log("Sales Report Error:", error);

    res.status(500).json({

      success: false

    });

  }

};

const downloadExcel = async (req, res) => {

try {

const { filter, startDate, endDate } = req.query;

const query = getQuery(
filter,
startDate,
endDate
);

// const orders = await Order.find(query)

// .populate("user_id","username")

// .populate("payment_id","payment_method")

// .sort({ ordered_at: -1 });


// let deliveredSales = 0;

// let refundAmount = 0;

// let cancelledAmount = 0;

// let returnedAmount = 0;

// let updatedOrders = [];


// // =======================

// for(const order of orders){

// const items = await OrderItem.find({

// order_id: order._id

// });

// let deliveredCount = 0;

// let cancelledCount = 0;

// let returnedCount = 0;

// let refund = 0;

// items.forEach(item=>{

// const amount =

// item.price * item.quantity;


// // Delivered

// if(item.status === "Delivered"){

// deliveredCount++;
// deliveredSales += item.final_amount;

// }


// // Cancelled

// if(item.status === "Cancelled"){

// cancelledCount++;

// cancelledAmount += amount;

// refund += item.final_amount;
// refundAmount += item.final_amount;

// }


// // Returned

// if(item.status === "Returned"){

// returnedCount++;

// returnedAmount += amount;
// refund += item.final_amount;
// refundAmount += item.final_amount;

// }

// });


// updatedOrders.push({

// ...order._doc,

// deliveredCount,

// cancelledCount,

// returnedCount,

// refund

// });

// }


// // =======================

// const totalOrders = orders.length;


// const couponDiscount = orders.reduce(

// (sum,order)=>

// sum + (order.coupon_discount || 0),

// 0

// );


// const offerDiscount = orders.reduce(

// (sum,order)=>

// sum + (order.offer_discount || 0),

// 0

// );
// const grossSales = orders.reduce(
//     (sum, order) => sum + (order.subtotal || 0),
//     0
// );

// const revenue = deliveredSales;

// const totalRevenue = deliveredSales;


// const totalSales =deliveredSales - refundAmount;
const orders = await Order.find(query)
  .populate("user_id", "username")
  .populate("payment_id", "payment_method")
  .sort({ ordered_at: -1 });

let deliveredSales = 0;
let refundAmount = 0;
let cancelledAmount = 0;
let returnedAmount = 0;

let updatedOrders = [];

// =======================

for (const order of orders) {

  const items = await OrderItem.find({
    order_id: order._id
  });

  let deliveredCount = 0;
  let cancelledCount = 0;
  let returnedCount = 0;
  let refund = 0;

  for (const item of items) {

    const amount = item.price * item.quantity;

    // Delivered
    if (item.status === "Delivered") {

      deliveredCount++;
      deliveredSales += item.final_amount;

    }

    // Cancelled
    else if (item.status === "Cancelled") {

      cancelledCount++;

      cancelledAmount += amount;

      refund += item.refund_amount || 0;
      refundAmount += item.refund_amount || 0;

    }

    // Returned
    else if (item.status === "Returned") {

      returnedCount++;

      returnedAmount += amount;

      refund += item.refund_amount || 0;
      refundAmount += item.refund_amount || 0;

    }

  }

  updatedOrders.push({

    ...order._doc,

    deliveredCount,

    cancelledCount,

    returnedCount,

    refund

  });

}

// =======================

const totalOrders = orders.length;

const couponDiscount = orders.reduce(
  (sum, order) => sum + (order.coupon_discount || 0),
  0
);

const offerDiscount = orders.reduce(
  (sum, order) => sum + (order.offer_discount || 0),
  0
);

const grossSales = orders.reduce(
  (sum, order) => sum + (order.subtotal || 0),
  0
);

const revenue = deliveredSales;



const totalSales = deliveredSales;
// =======================

const workbook =

new ExcelJS.Workbook();


const sheet =

workbook.addWorksheet(

"Sales Report"

);


// TITLE

sheet.mergeCells("A1:K1");

sheet.getCell("A1").value =

"FOOTCHIC SALES REPORT";


sheet.getCell("A1").font = {

bold:true,

size:18

};


sheet.getCell("A1").alignment = {

horizontal:"center"

};


// GENERATED

sheet.getCell("A3").value =

`Generated : ${new Date().toLocaleString()}`;


sheet.getCell("A4").value =

`Filter : ${filter}`;


// SUMMARY

sheet.getCell("A6").value =

"Total Orders";

sheet.getCell("B6").value =

totalOrders;


sheet.getCell("A7").value =

"Gross Sales";

sheet.getCell("B7").value =

grossSales;


sheet.getCell("A8").value =

"Revenue";

sheet.getCell("B8").value =

revenue;


sheet.getCell("A9").value =

"Offer Discount";

sheet.getCell("B9").value =

offerDiscount;


sheet.getCell("A10").value =

"Coupon Discount";

sheet.getCell("B10").value =

couponDiscount;


sheet.getCell("A11").value =

"Refund Amount";

sheet.getCell("B11").value =

refundAmount;


// =======================

sheet.columns = [

{

header:"Order ID",

key:"orderId",

width:18

},

{

header:"Date",

key:"date",

width:18

},

{

header:"Customer",

key:"customer",

width:25

},

{

header:"Payment",

key:"payment",

width:20

},

{

header:"Amount",

key:"amount",

width:18

},

{

header:"Offer",

key:"offer",

width:18

},

{

header:"Coupon",

key:"coupon",

width:18

},

{

header:"Delivered",

key:"delivered",

width:15

},

{

header:"Cancelled",

key:"cancelled",

width:15

},

{

header:"Returned",

key:"returned",

width:15

},

{

header:"Refund",

key:"refund",

width:18

}

];


// TABLE START ROW

const startRow = 14;


// HEADER

sheet.getRow(startRow).values = [

"Order ID",

"Date",

"Customer",

"Payment",

"Amount",

"Offer",

"Coupon",

"Delivered",

"Cancelled",

"Returned",

"Refund"

];


// DATA

updatedOrders.forEach(order=>{

sheet.addRow({

orderId: order.orderId,

date: new Date(

order.ordered_at

).toLocaleDateString(),

customer:

order.user_id?.username || "-",

payment:

order.payment_id?.payment_method || "COD",

amount: order.subtotal || 0,

offer:

order.offer_discount || 0,

coupon:

order.coupon_discount || 0,

delivered:

order.deliveredCount || 0,

cancelled:

order.cancelledCount || 0,

returned:

order.returnedCount || 0,

refund:

order.refund || 0

});

});


// =======================

// BORDER

sheet.eachRow(row=>{

row.eachCell(cell=>{

cell.border={

top:{style:"thin"},

left:{style:"thin"},

bottom:{style:"thin"},

right:{style:"thin"}

};

});

});


// HEADER STYLE

sheet.getRow(startRow).font={

bold:true

};


// DOWNLOAD

res.setHeader(

"Content-Type",

"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

);


res.setHeader(

"Content-Disposition",

'attachment; filename="sales-report.xlsx"'

);


await workbook.xlsx.write(res);

res.end();

}

catch(error){

console.log(error);

res.redirect(

"/admin/salesreport"

);

}

};

const downloadPdf = async (req, res) => {

try {

const { filter, startDate, endDate } = req.query;

const query = getQuery(
filter,
startDate,
endDate
);

const orders = await Order.find(query)

.populate("user_id", "username")

.populate(
"payment_id",
"payment_method"
)

.sort({
ordered_at: -1
});



let deliveredSales = 0;

let refundAmount = 0;

let cancelledAmount = 0;

let returnedAmount = 0;

let updatedOrders = [];



for (const order of orders) {

let deliveredCount = 0;

let cancelledCount = 0;

let returnedCount = 0;

let refund = 0;



const items = await OrderItem.find({

order_id: order._id

});



items.forEach(item => {

// const amount =

// item.price * item.quantity;



if (

item.status === "Delivered"

) {

deliveredCount++;

// deliveredSales += amount;
deliveredSales += item.final_amount;
}



// if (

// item.status === "Cancelled"

// ) {

// cancelledCount++;

// cancelledAmount += amount;
// refund += item.final_amount;
// refundAmount += item.final_amount;

// }
if (item.status === "Cancelled") {

    cancelledCount++;

    cancelledAmount += item.final_amount;

    refund += item.refund_amount || item.final_amount;

    refundAmount += item.refund_amount || item.final_amount;

}


if (item.status === "Returned") {

    returnedCount++;

    returnedAmount += item.final_amount;

    refund += item.refund_amount || item.final_amount;

    refundAmount += item.refund_amount || item.final_amount;

}

// if (

// item.status === "Returned"

// ) {

// returnedCount++;

// returnedAmount += amount;

// refund += item.final_amount;
// refundAmount += item.final_amount;

// }

});



updatedOrders.push({

...order._doc,

deliveredCount,

cancelledCount,

returnedCount,

refund

});

}



const totalOrders =

orders.length;



const couponDiscount =

orders.reduce(

(sum, order) =>

sum +

(order.coupon_discount || 0),

0

);



const offerDiscount =

orders.reduce(

(sum, order) =>

sum +

(order.offer_discount || 0),

0

);

const grossSales = orders.reduce(
    (sum, order) => sum + (order.subtotal || 0),
    0
);

const revenue = deliveredSales;






const doc = new PDFDocument({

size: "A3",

layout: "landscape",

margin: 20

});



res.setHeader(

"Content-Type",

"application/pdf"

);



res.setHeader(

"Content-Disposition",

'attachment; filename="sales-report.pdf"'

);



doc.pipe(res);



// HEADER

doc

.fontSize(22)

.font("Helvetica-Bold")

.text(

"FOOTCHIC",

{

align: "center"

}

);



doc

.fontSize(16)

.text(

"SALES REPORT",

{

align: "center"

}

);



doc.moveDown();



doc

.fontSize(10)

.font("Helvetica")

.text(

`Generated : ${new Date().toLocaleString()}`,

{

align: "center"

}

);



doc.text(

`Filter : ${filter}`,

{

align: "center"

}

);



if (

startDate &&

endDate

) {

doc.text(

`${startDate} to ${endDate}`,

{

align: "center"

}

);

}



doc.moveDown();



// SUMMARY

doc

.fontSize(14)

.font("Helvetica-Bold")

.text("Summary");



doc.moveDown(.5);



doc

.fontSize(11)

.font("Helvetica");



doc.text(

`Total Orders : ${totalOrders}`

);



doc.text(

`Gross Sales  : ₹${grossSales}`

);



doc.text(

`Revenue : ₹${revenue}`

);



doc.text(

`Offer Discount : ₹${offerDiscount}`

);



doc.text(

`Coupon Discount : ₹${couponDiscount}`

);



doc.text(

`Refund Amount : ₹${refundAmount}`

);



doc.moveDown();



// TABLE TITLE

doc

.fontSize(14)

.font("Helvetica-Bold")

.text("Order History");



doc.moveDown();



let y = doc.y;



const headers = [

{ text:"Order#", x:20 },

{ text:"Date", x:110 },

{ text:"Customer", x:210 },

{ text:"Payment", x:330 },

{ text:"Amount", x:450 },

{ text:"Offer", x:540 },

{ text:"Coupon", x:630 },

{ text:"Delivered", x:720 },

{ text:"Cancelled", x:820 },

{ text:"Returned", x:920 },

{ text:"Refund", x:1020 }

];



doc.rect(

15,

y,

1080,

25

)

.fillAndStroke(

"#eeeeee",

"#000"

);



doc.fillColor("black");

doc.fontSize(9);

doc.font("Helvetica-Bold");



headers.forEach(header=>{

doc.text(

header.text,

header.x,

y+8

);

});



y += 25;



doc.font("Helvetica");



updatedOrders.forEach(order=>{

if(y>760){

doc.addPage();

y=40;

}



doc.rect(

15,

y,

1080,

25

)

.stroke();



doc.text(

order.orderId,

20,

y+8

);



doc.text(

new Date(

order.ordered_at

).toLocaleDateString(),

110,

y+8

);



doc.text(

order.user_id?.username || "-",

210,

y+8,

{

width:100

}

);



doc.text(

order.payment_id?.payment_method || "COD",

330,

y+8

);



doc.text(

`₹${order.total_price}`,

450,

y+8

);



doc.text(

`₹${order.offer_discount || 0}`,

540,

y+8

);



doc.text(

`₹${order.coupon_discount || 0}`,

630,

y+8

);



doc.text(

order.deliveredCount,

740,

y+8

);



doc.text(

order.cancelledCount,

840,

y+8

);



doc.text(

order.returnedCount,

940,

y+8

);



doc.text(

`₹${order.refund}`,

1030,

y+8

);



y += 25;

});



doc.moveDown();



doc.fontSize(10);



doc.text(

"Generated by FootChic Admin Panel",

20,

y+20

);



doc.end();

}

catch(error){

console.log(error);

res.redirect(

"/admin/salesreport"

);

}

};





module.exports={ loadSalesReport , getSalesReportData,downloadPdf,downloadExcel}