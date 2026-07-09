const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema({

offerTitle:{
    type:String,
    required:true
},

offerType: {
        type: String,
        enum: ["PRODUCT", "CATEGORY"],
        required: true
    },

    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        default: null
    },

    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        default: null
    },

    discountType: {
        type: String,
          default: "percentage",
        required: true
    },

    discountPercentage: {
        type: Number,
        required: true
    },

    startDate: {
        type: Date,
        required: true
    },

    endDate: {
        type: Date,
        required: true
    },

    isActive: {
        type: Boolean,
        default: true
    }

}, { timestamps: true });

module.exports = mongoose.model("Offer", offerSchema);