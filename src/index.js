// import mongoose from "mongoose"
// import {dbName} from "./constants"
// import express from "express"


import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path : "./.env"
});

connectDB();








// const app = express()

// ( async () => {
//     try{
//        await mongoose.connect(`${process.env.MONGODB_URL}/${dbName}`)
//        app.on("Error",(error)=>{
//         console.log("Error came : ",error);
//         throw error;
//        })

//        app.listen(process.env.PORT,()=>{
//         console.log(`server is running on port ${process.env.PORT}`);
        
//        })
//     }
//     catch(error)
//     {
//         console.error("Error occured : ",error)
//         throw error;
        
//     }
// })()