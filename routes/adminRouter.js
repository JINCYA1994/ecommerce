 const express = require('express');
const router = express.Router();     
const adminController=require('../controllers/admin/adminController') 
const customerController=require('../controllers/admin/customerController')
const categoryController=require('../controllers/admin/categoryController')
 const addproductController=require('../controllers/admin/addproductController')
 const productController=require('../controllers/admin/productController')
 const editproductController=require('../controllers/admin/editproductController')
 const{userAuth,adminAuth}=require('../middlewares/auth')
const upload = require('../config/multer'); 


router.get('/login',adminController.loadLogin) 
router.post('/login',adminController.verifyLogin)
router.get('/logout',adminController.logout)
router.get('/pageerror',adminController.pageError)

//dashboard
router.get('/dashboard',adminAuth,adminController.loadDashboard)



//Customer Management
router.get('/unblock/:id',customerController.unblockUser)
router.get('/block/:id',customerController.blockUser)
router.get('/users',customerController.getUsers)

//Catogory Management
router.get('/category',adminAuth,categoryController.getcategory)
router.post('/category' ,categoryController.addCategory);
router.post('/category/edit/:id', categoryController.updateCategory);
router.get('/category/list/:id',categoryController.listCategory)
router.get('/category/unlist/:id',categoryController.unlistCategory)
router.post('/category/delete/:id',categoryController.deleteCategory)
    
//  add product
router.get('/products/add',adminAuth,addproductController. getAddProduct)
router.post('/products',upload.fields([
  { name: 'originalImages', maxCount: 100 },
  { name: 'croppedImagesData', maxCount: 100 }
]), addproductController.  postAddProduct);


//product management
router.get('/products',productController.getProducts)
router.post('/products/:productId/variant/:variantId/size/:sizeId/delete',productController.deleteSize)
router.get('/products/:productId/variant/:variantId/size/:sizeId/list',productController.listProduct)
router.get('/products/:productId/variant/:variantId/size/:sizeId/unlist',productController.unlistProduct)

// edit product
router.get('/products/:productId/variant/:variantId/size/:sizeId/edit',editproductController.getEditProduct)
router.post('/products/:productId/variant/:variantId/size/:sizeId/edit',upload.fields([
  { name: 'originalImages', maxCount: 100 },
  { name: 'croppedImagesData', maxCount: 100 }
]),editproductController.updateProduct)



module.exports  =router