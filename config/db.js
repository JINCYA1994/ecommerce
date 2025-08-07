const mongoose = require('mongoose');
const env=require('dotenv').config()


const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log(' MongoDB Connected Successfully');
    } catch (error) {
        console.error(' MongoDB Connection Error:', error);
        process.exit(1); 
    }
};

module.exports = connectDB;