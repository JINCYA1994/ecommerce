 const express = require('express');
const router = express.Router();     
 const adminController=require('../controllers/admin/adminController') 
 const customerController=require('../controllers/admin/customerController')
 const{userauth,adminAuth}=require('../middlewares/auth')
 

router.get('/login',adminController.loadLogin)
router.post('/login',adminController.verifyLogin)




     module.exports  =router