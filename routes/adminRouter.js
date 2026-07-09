 const express = require('express');
const router = express.Router();     
const adminController=require('../controllers/admin/adminController') 
const customerController=require('../controllers/admin/customerController')
const categoryController=require('../controllers/admin/categoryController')
 const addproductController=require('../controllers/admin/addproductController')
 const productController=require('../controllers/admin/productController')
 const editproductController=require('../controllers/admin/editproductController')
  const ordersController=require('../controllers/admin/ordersController')
  const couponController =require('../controllers/admin/couponController')
  const offerController=require('../controllers/admin/offerController')
   const dashboardController=require('../controllers/admin/dashboardController')
  
 const{userAuth,adminAuth}=require('../middlewares/auth')
const upload = require('../config/multer'); 
const preventAdminLogin = require('../middlewares/preventAdminLogin');
const salesController=require('../controllers/admin/salesController')

router.get('/login',preventAdminLogin,adminController.loadLogin) 
router.post('/login',adminController.verifyLogin)
router.get('/logout',adminController.logout)
router.get('/pageerror',adminController.pageError)

// //dashboard
// router.get('/dashboard',adminAuth,adminController.loadDashboard)



//Customer Management
router.get('/unblock/:id',adminAuth,customerController.unblockUser)
router.get('/block/:id',adminAuth,customerController.blockUser)
router.get('/users',adminAuth,customerController.getUsers)

//Catogory Management
router.get('/category',adminAuth,categoryController.getcategory)
router.post('/category' ,adminAuth,categoryController.addCategory);
router.post('/category/edit/:id',adminAuth, categoryController.updateCategory);
router.get('/category/list/:id',adminAuth,categoryController.listCategory)
router.get('/category/unlist/:id',adminAuth,categoryController.unlistCategory)
router.post('/category/delete/:id',adminAuth,categoryController.deleteCategory)
    
//  add product
router.get('/products/add',adminAuth,addproductController. getAddProduct)


router.post(
  "/products",
  adminAuth,
  (req, res, next) => {
    upload.fields([
      { name: "originalImages", maxCount: 100 },
      { name: "croppedImagesData", maxCount: 100 }
    ])(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  addproductController.postAddProduct
);

//product management

router.get('/products',adminAuth,productController.getProducts)
router.post('/products/:productId/variant/:variantId/size/:sizeId/delete',adminAuth,productController.deleteSize)
router.get('/products/:productId/variant/:variantId/size/:sizeId/list',adminAuth,productController.listVariant)
router.get('/products/:productId/variant/:variantId/size/:sizeId/unlist',adminAuth,productController.unlistVariant)
router.post('/products/:productId/variant/:variantId/size/:sizeId/update-limit',adminAuth,productController.updateLimit);
router.get('/products/list/:productId',adminAuth,productController.listProduct)
router.get('/products/unlist/:productId',adminAuth,productController.unlistProduct)


// edit product

router.delete("/products/:productId/variant/:variantId/image/:index",editproductController.deleteVariantImage);
router.get( "/products/:productId/variant/:variantId/size/:sizeId/edit", adminAuth, editproductController.getEditProduct);
router.post('/products/:productId/variant/:variantId/size/:sizeId/edit',adminAuth,upload.fields([{ name: 'originalImages', maxCount: 100 },{ name: 'croppedImagesData', maxCount: 100 }]),editproductController.updateProduct)

// coupon management

router.get('/coupons',adminAuth,couponController.getCoupons)
router.post('/coupons/add', adminAuth, couponController.createCoupon)
router.post('/coupons/delete/:id',adminAuth,couponController.deleteCoupon)
router.post("/coupons/edit/:id", adminAuth,couponController.updateCoupon);

// offer management

router.get('/offers',adminAuth,offerController.getOfferPage)
router.post('/offers/add', adminAuth,offerController.createOffer)
router.post('/offers/delete/:id',adminAuth,offerController.deleteOffer)
router.post("/offers/edit/:id",adminAuth,offerController.updateOffer);

// ordermanagement

router.get('/orders',adminAuth,ordersController.getordersPage)
router.post('/orders/update-product-status/:itemId', ordersController.updateProductStatus);
router.get('/orders/:orderId', ordersController.viewOrderDetails);
router.post('/orders/return',ordersController.handleReturn);

//sales report

router.get('/salesreport',adminAuth,salesController. loadSalesReport );
router.get(
  "/sales-report/data",
  adminAuth,
  salesController.getSalesReportData
);

router.get(
  "/sales-report/pdf",
  adminAuth,
  salesController.downloadPdf
);

router.get(
  "/sales-report/excel",
  adminAuth,
  salesController.downloadExcel
);



//dashboard

router.get( "/dashboard",adminAuth,dashboardController.loadDashboard);


router.get("/dashboard-data", adminAuth, dashboardController.getDashboardData);

module.exports  =router