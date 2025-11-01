const asyncHandler = (reqHandler) => { // using Promise.resolve 
    return async (req, res, next) => {
        Promise.resolve(reqHandler(req, res, next)).
        catch((err)=> next(err));
    };
};         
export default asyncHandler;



//another way of writing the same function
// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next);
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message || "Internal Server Error",
//         });
//     }
// }; // this is also used frequently 
