const asyncHandler = (fn) => async(req, res, next) => {
    try{
        return await fn(req, res, next)
    }
    catch(err){
        console.log(err)
        const errCode = err.code || 500
        res.status(errCode)
            .json({
                success: false,
                message: err.message
            })
    }
}

export {asyncHandler}