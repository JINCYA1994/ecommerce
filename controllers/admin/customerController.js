 const User=require('../../models/userSchema')


 
 const unblockUser=async(req,res)=>{
  try{
   let id=req.params.id
   await User.updateOne({_id:id},{$set:{isBlocked:false}})
   res.redirect('/admin/users')
  }catch(err){
    console.error(err)
       res.status(500).send("Server Error")
  }

 }
const blockUser = async (req, res) => {
  try {
    let id = req.params.id;
    await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect('/admin/users');
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const getUsers = async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit =2;
    let skip = (page - 1) * limit;
    let search = req.query.search || "";

    // Search filter (by name or email)
    let query = {};
    if (search) {
      query = {
        $or: [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ]
      };
    }

    let totalUsers = await User.countDocuments(query);
    let users = await User.find(query).skip(skip).limit(limit);

    let totalPages = Math.ceil(totalUsers / limit);

    res.render('users', {
      users,
      currentPage:page,
      totalPages,
      search
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
};


 
 
 module.exports={getUsers,unblockUser,blockUser,}