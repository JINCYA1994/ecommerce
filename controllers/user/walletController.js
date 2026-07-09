const Wallet = require('../../models/walletSchema');



const walletPage = async (req, res) => {

   try {
    const userData = req.session.user || null;
      const userId = req.session.user;

      const wallet = await Wallet.findOne({
         userId
      }
 );

      if (!wallet) {

         return res.render('wallet', {
            wallet: {
               balance: 0,
               transactions: []
            },
  currentPage: 1,

      totalPages: 0,

      activePage: 'wallet',

      userData

         });
      }



 const page = parseInt(req.query.page) || 1;

const limit = 10;





wallet.transactions.sort(
 (a,b) => new Date(b.date) - new Date(a.date)
);

const totalTransactions = wallet.transactions.length;

const totalPages = Math.ceil(totalTransactions / limit);

const startIndex = (page - 1) * limit;

const paginatedTransactions = wallet.transactions.slice(
  startIndex,
  startIndex + limit
);

res.render('wallet',{

  wallet:{
    ...wallet.toObject(),
    transactions: paginatedTransactions
  },

  currentPage: page,

  totalPages,

  activePage:'wallet',

  userData

});
      


   } catch (error) {

      console.log(error);

         res.redirect('/pageNotFound');
   }
};



module.exports = {
   walletPage
};