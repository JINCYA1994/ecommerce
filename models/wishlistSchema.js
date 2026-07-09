const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },

      var_id: {        
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },

      size: {            
        type: Number,
        required: true
      },

      addedAt: {
        type: Date,
        default: Date.now
      }
    }
  ]

}, { timestamps: true });

module.exports = mongoose.model("Wishlist", wishlistSchema);