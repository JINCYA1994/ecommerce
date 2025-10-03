 const Product=require('../../models/productSchema')
 const Category=require('../../models/categorySchema')



 const addProduct=async(req,res)=>{
try{
const categories=await Category.find({isDeleted:{$ne:true}})
// console.log("Categories found:", categories);

    res.render('addproduct',{
        categories:categories,
         success: req.flash('success'),
         error: req.flash('error') })  
}catch (err) {
        console.error(err);
        res.render('addproduct', {
            categories: [],
            success: [],
            error: ['Something went wrong']
        });
    }
}







 module.exports={addProduct,}