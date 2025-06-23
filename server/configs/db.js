import mongoose from "mongoose";

const connectDB = async () => {
    try {
       mongoose.connection.on('connected', () => ( // just give message
            console.log("data-base Connected")
       ));
       await mongoose.connect(`${process.env.MONGODB_URI}/grokart`);
    } catch (error) {
        console.error(error.message);
    }
}

export default connectDB;