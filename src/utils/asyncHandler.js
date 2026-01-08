const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

//OR            OR              OR              OR              OR

// const asynchandler = () => {}
// const asynchandler = (func) => () => {}
// const asynchandler = (func) => async() => {}
//               -->these above 3 lines are demo of below function

// const asyncHandler = (fun) => async(req,res,next) => {
//     try {
//         await fn(req,res,next)
//     } catch (error) {
//         res.status(error.code || 5).json({
//             success : false,
//             message : error.message
//         })
//     }
// }

export { asyncHandler };
