 const User=require('../models/userSchema')
 const userauth=(req,res,next)=>{
    if(req.session.user){
        User.findById(req.session.user.id).then(data=>{
            if(data && !data.isActive){
                next()
            }else{

                res.redirect('/login')
            }
        }).catch(error=>{
            console.log("Error in user auth middileware")
            res.status(500).send('Internal server error')
        })
    }else{
         
          res.redirect('/login')
    }
 }

const adminAuth=(req,res,next)=>{
    if(req.session && req.session.user){
User.findById(req.session.user.id).then(data=>{
    if(data && data.role==='admin'){
        req.user=data
        next()
    }
    else{
        res.redirect('/admin/adminlogin')
    }
}).catch(error=>{
    console.log('Error in adminoauth middileware',error)
    res.status(500).send('Internal Server Error')
})


}else{
    res.redirect('/admin/adminlogin')
}

}



 module.exports={userauth,adminAuth}