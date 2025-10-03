import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiErrors.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";
import e from "express";

const generateAccessAndRefereshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken =  user.generateAccessToken();
        const refreshToken =  user.generateRefreshToken();

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return{ accessToken, refreshToken }



    } catch (error) {
        throw new ApiError(500, "something went wrong while generating refresh and access token")
    }
}


const registerUser = asyncHandler( async (req, res) => {
   

    const {fullName, email , username , password } = req.body;
    // console.log("email: ", email);
    if (
        [fullName, email,username ,password].some((field) => field?.trim() === "" )
        )
        {
            throw new ApiError(400,"all fields are required")      
        }
        const existedUser = await User.findOne({
            $or: [{username}, {email}]

        })

        if (existedUser) {
            throw new ApiError(409, "user with email or username already exists")
            
        }

        const avatarLocalPath = req.files?.avatar[0]?.path;
        // const coverImageLocalPath = req.files?.coverImage[0]?.path;

        let coverImageLocalPath;
        if (req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length >0) {
            coverImageLocalPath = req.files.coverImage[0].path
        }


        if (!avatarLocalPath) {
            throw new ApiError(400,"avatar file is required")
            
        }
        const avatar = await uploadOnCloudinary(avatarLocalPath)
        const coverImage = await uploadOnCloudinary(coverImageLocalPath)

        if (!avatar) {
            throw new ApiError(400,"avatar file is required")
            
        }

        const user = await User.create({
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase()
        })

        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )

        if (!createdUser) {
            throw new ApiError(500, "something went wrong while registering the user")
        }

        return res.status(201).json(
            new ApiResponse(200, createdUser, "user registered successfully")
        )

} )

const loginUser = asyncHandler( async (req, res) =>{

    const {email, username, password} = req.body
    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await  User.findOne({
        $or: [{username},{email}]
    })
    if (!user) {
        throw new ApiError (404, "user doesnot exists")      
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError (401, "password incorrect");    
    }

    const { accessToken, refreshToken } =  await generateAccessAndRefereshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken" , accessToken  , options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, {
            user: loggedInUser, accessToken, refreshToken
        }, "user logged in successfully"
        )
    )

})


const logoutUser = asyncHandler(async(req,res) => {
    await User.findByIdAndUpdate(
    req.user._id,
        {
            $set: {refreshToken: undefined}
        },{
            new: true
        })
         const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200,{}, "user logged out"))

})

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshtToken = req.cookies.refreshToken || req.body.refreshToken
    
    if (!incomingRefreshtToken) {
        throw new ApiError(401, "unauthorised request")  
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshtToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
        
        if (!user) {
            throw new ApiError(401, "invalid request token")  
        }
    
    
        if (incomingRefreshtToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh token is expired or used")  
        }
    
    
        const options = {
            httpOnly: true,
            secure: true
        }
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshToken(user._id)
    
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200, {accessToken, refreshToken: newRefreshToken},
                "access token refreshed  "
            )
        )
    } catch (error) {
        throw new ApiError (401, error?.message || "invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})  

    return res
    .status(200)
    .json(new ApiResponse(200 ,{} , "password changes successfully"))

})

const getCurrentUser = asyncHandler(async(req, res) =>{
    return res.status(200).json(new ApiResponse(200, req.user , "current user fetched successfully "))
})

const updateAccountDetails = asyncHandler(async(req, res) =>{
    const {fullName , email} = req.body

    if (!fullName || !email) {
        throw new ApiError(400,"all field are required")
        
    }

    const user  = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
    ).select("-password ")

    return res
    .status(200)
    .json(new ApiResponse(200, user , "account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.files?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "error while uploading avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status
    .json(
        new ApiResponse(200, user, "avatar image uppdated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.files?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400, "cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "error while uploading image")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status
    .json(
        new ApiResponse(200, user, "cover image uppdated successfully")
    )
})


export { registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
 }