
import dotenv from "dotenv";
dotenv.config({
    path : "./.env"
});
import connectDB from "./db/index.js";
import { app } from "./app.js";

// const app = express()



connectDB()
.then(()=>{

    app.on("Error",(error)=>{
        console.log("Error came : ",error);
        throw error;
       })

    app.listen(process.env.PORT || 7000,()=>{
        console.log(`Server is running at port ${process.env.PORT}`);
        
    })
})
.catch((error)=>{
    console.log("Mongo db error !! ",error);
    
})








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