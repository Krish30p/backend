import { ApiError } from "../utils/ApiErrors";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model"


export const verifyJWT = asyncHandler(async(req, res, next) =>{
    try {
        const Token =  req.cookies?.accessToken || req.header("authorisation")?.replace("Bearer", "")
    
        if (!Token) {
            throw new ApiError(401, "unauthorised request")
            
        }
        const decodedToken =  jwt.verify(Token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (!user) {
            throw new ApiError(401,"invalid access token ")
        }
    
        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid acces token")
    }


})