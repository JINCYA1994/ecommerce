const loadHomepage=async (req,res)=>{
    try {
      return res.render('home')
    } catch (error) {
       console.log('Home page not found',error.message)
       res.status(500).send('Server error') 
    }
}




module.exports={loadHomepage,}   