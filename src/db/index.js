import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"

export const connectDB = async() => {
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`Connection Established | DB Host : ${connectionInstance}`)
    }
    catch(error){
        console.log(error)
        process.exit(1)
    }
}