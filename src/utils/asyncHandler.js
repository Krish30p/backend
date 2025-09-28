const asyncHandler = (requestHandler) => {
    (req, res ,next) =>{
        Promise.resolve(requestHandler(req, res ,next)).catch((err) => next(err))
    }
}



const {asyncHandler}



// const asyncHandler = (fn) => async (req, res ,next) => {
//     try {
//         await fn(req, res ,next)
//     } catch (error) {
//         res.status(err.code),json({
//             sccesss: false,
//             message: err.message
//         })
//     }
// }