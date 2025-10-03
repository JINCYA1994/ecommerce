 const Category=require('../../models/categorySchema')

const getcategory=async(req,res)=>{
try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    let limit = 2;

    
    let query = { isDeleted: { $ne: true } };
    if (search) {
      query.name = { $regex: search, $options: "i" }; 
    }

  
    const totalCategories = await Category.countDocuments(query);

 
    const categories = await Category.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });


    const totalPages = Math.ceil(totalCategories / limit);

    res.render('category', {
      categories,
      search,
      currentPage: page,
      totalPages,
  success: req.flash('success'),
  error: req.flash('error')
    });
  } catch (err) {
    console.error("Error loading categories:", err);
    res.status(500).send("Server Error");
  }
};


//add category

const addCategory=async(req,res)=>{
  try{
const{name,description}=req.body
if (!name || !description) {
      req.flash('error', 'All fields are required!');
      return res.redirect('/admin/category');
    }



const exists = await Category.findOne({ name :{ $regex: `^${name}$`, $options: 'i' } });
    if (exists) {
      console.log("Category already exists:",name);
      req.flash('error', 'Category already exists!');
     return res.redirect("/admin/category?error=exists"); 
    } 
    
   //create category collection 
 const newCategory = new Category({
     name,
      description
     
    });   
//console.log("Before saving:", await Category.find({}));
    await newCategory.save();
//console.log("After saving:", await Category.find({}));

    res.redirect("/admin/category");         // after save , redirect to category page
  } catch (err) {
    console.error("Error adding category:", err);
    res.status(500).send("Server Error");
  }
};

//update category
const updateCategory=async(req,res)=>{
   try{
    
    const {id}=req.params
    const{name,description}=req.body

   if (!name || !description) {
      req.flash('error', 'All fields are required!');
      return res.redirect('/admin/category');
    }

    
await Category.updateOne(
      { _id: id },              
      { $set: { name, description } } 
    );
req.flash('success', 'Category Updated successfully!');
    res.redirect('/admin/category');

  } 
  catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};


//list category
const listCategory=async(req,res)=>{
  try{
    const{id}=req.params
    await Category.updateOne({_id:id},{$set:{isListed:true}})
    res.redirect('/admin/category')
  }catch(err){
    console.error(err)
    res.status(500).send('Server Error')
  }
}

//unlist category
const unlistCategory=async(req,res)=>{
  try{
    const{id}=req.params
    await Category.updateOne({_id:id},{$set:{isListed:false}})
    res.redirect('/admin/category')
  }catch(err){
    console.error(err)
    res.status(500).send('Server Error')
  }
}
  

//delete category

const deleteCategory=async(req,res)=>{
  try{
    const {id}=req.params
await Category.updateOne({_id:id},{$set:{isDeleted:true}})
 req.flash('success', 'Category deleted successfully!');

console.log("category deleted successfully")
res.redirect('/admin/category')
}
catch(err){
console.error(err)
 req.flash('error', 'Something went wrong while deleting the category');

 
res.redirect('/admin/category')
}
}








 
 module.exports={getcategory,addCategory,updateCategory,listCategory,unlistCategory,deleteCategory}