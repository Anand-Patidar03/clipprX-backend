import mongoose,{Schema} from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new mongoose.Schema({

    username : {
        type : String,
        required : [true,"Username is required"],
        unique : true,
        lowercase : true,
        trim : true,
        index : true
    },
    email : {
        type : String,
        required : [true,"E-mail is required"],
        unique : true,
        lowercase : true,
        trim : true,
    },
    fullName : {
        type : String,
        required : [true,"Fullname is required"],
        trim : true,
        index : true
    },
    avatar : {
        type : String,    //url
        required : [true,"Avatar is mandatory"]
    },
    coverImage : {
        type : String       //url
    },
    watchHistory : [
        {
            type : mongoose.Schema.Types.ObjectId,
            ref : "Video"
        }
    ],
    password : {
        type : String,
        required : [true,"Password is required"]
    },
    refreshToken : {
        type : String
    }

},{timestamps : true})

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 10);
});


userSchema.methods.isPwdCorrect = async function(pwd){
    return await bcrypt.compare(pwd,this.password)
}

userSchema.methods.generateAccessToken = function()
{
    return jwt.sign(
        {
            _id : this._id,
            userName : this.userName,
            email : this.email,
            fullName : this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}


userSchema.methods.generateRefreshToken = function()
{
    return jwt.sign(
        {
            _id : this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User",userSchema)