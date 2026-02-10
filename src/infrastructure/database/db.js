import mongoose from 'mongoose';

export const connectDB = async()=>{
    try{
        await mongoose.conn(process.env.MONGO_URI);
        console.log("MongoDB connected");
    }catch(error){
        console.error('Database connection failed:', error);
        process.exit(1);
    }
};