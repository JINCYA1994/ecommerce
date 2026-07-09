 const Category=require('../../models/categorySchema')
 const Product = require('../../models/productSchema');


const getcategory = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    let limit = 5;

    let query = { isDeleted: { $ne: true } };

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const totalCategories = await Category.countDocuments(query);

    const categories = await Category.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    // FIXED HERE
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
       const productCount = await Product.countDocuments({
  category_id: cat._id,
  isDeleted: false,
  variants: {
    $elemMatch: {
      sizes: {
        $elemMatch: {
          isDeleted: false
        }
      }
    }
  }
});

        return {
          ...cat.toObject(),
          productCount
        };
      })
    );

    const totalPages = Math.ceil(totalCategories / limit);

    res.render('category', {
      categories: categoriesWithCount,
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
     return res.redirect("/admin/category"); 
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
   const name = req.body.name.trim();
    const description = req.body.description.trim();



   if (!name || !description) {
      req.flash('error', 'All fields are required!');
      return res.redirect('/admin/category');
    }


const categoryExist=await Category.findOne({name :{ $regex: `^${name}$`, $options: "i" }  , _id: { $ne: id } })
if(categoryExist){
  req.flash('error', 'Category already exists!');
     return res.redirect("/admin/category")
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
  
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const productsExist = await Product.findOne({
      category_id: id,
      isDeleted: false,
      variants: {
        $elemMatch: {
          sizes: {
            $elemMatch: {
              isDeleted: false
            }
          }
        }
      }
    });

    if (productsExist) {
      req.flash('error', 'Cannot delete category! Active products exist.');
      return res.redirect('/admin/category');
    }

    await Category.updateOne(
      { _id: id },
      { $set: { isDeleted: true } }
    );

    req.flash('success', 'Category deleted successfully!');
    res.redirect('/admin/category');

  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong while deleting the category');
    res.redirect('/admin/category');
  }
};


// const deleteCategory = async (req, res) => {
//   try {
//     const { id } = req.params;
// const productsExist = await Product.findOne({
//   category_id: id,
//   isDeleted: false,
//   variants: {
//     $elemMatch: {
//       sizes: {
//         $elemMatch: {
//           isDeleted: false
//         }
//       }
//     }
//   }
// });
   
  
//     if (productsExist) {
//       req.flash('error', 'Cannot delete category! Products exist under this category.');
//       return res.redirect('/admin/category');
//     }

//     //  If no products → delete
//     await Category.updateOne(
//       { _id: id },
//       { $set: { isDeleted: true } }
//     );

//     req.flash('success', 'Category deleted successfully!');
//     res.redirect('/admin/category');

//   } catch (err) {
//     console.error(err);
//     req.flash('error', 'Something went wrong while deleting the category');
//     res.redirect('/admin/category');
//   }
// };






 
 module.exports={getcategory,addCategory,updateCategory,listCategory,unlistCategory,deleteCategory}