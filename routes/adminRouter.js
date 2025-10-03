 const express = require('express');
const router = express.Router();     
 const adminController=require('../controllers/admin/adminController') 
 const customerController=require('../controllers/admin/customerController')
  const categoryController=require('../controllers/admin/categoryController')
  const productController=require('../controllers/admin/productController')
 const{userauth,adminAuth}=require('../middlewares/auth')
 const multer=require('multer')
 
 const upload=require('../middlewares/multer')


router.get('/login',adminController.loadLogin) 
router.post('/login',adminController.verifyLogin)



//Customer Management
router.get('/unblock/:id',customerController.unblockUser)
router.get('/block/:id',customerController.blockUser)
router.get('/users',customerController.getUsers)

//Catogory Management
router.get('/category',categoryController.getcategory)
router.post('/category' ,categoryController.addCategory);
router.post('/category/edit/:id', categoryController.updateCategory);
router.get('/category/list/:id',categoryController.listCategory)
router.get('/category/unlist/:id',categoryController.unlistCategory)
router.post('/category/delete/:id',categoryController.deleteCategory)
    
//product management
router.get('/products/add',productController.addProduct)


module.exports  =router