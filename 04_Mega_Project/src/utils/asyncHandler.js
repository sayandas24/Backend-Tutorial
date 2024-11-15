// Higher order function
/*
The main goal of asyncHandler is to:

Wrap any asynchronous function.
Automatically handle errors, so you don’t need try-catch blocks in every route handler.
*/ 
/*
EXAMPLE OF THIS FUNCTION

    app.get('/example', asyncHandler(async (req, res, next) => {
        // Your async code here
        const data = await someAsyncFunction();
        res.json({ success: true, data });
    }));

*/ 

// 1 easy way syntax that is used in production

const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise
        .resolve(requestHandler(req, res, next))
        .catch(err => next(err))
    }
}
export { asyncHandler }



/*
2 .Example  one 

 const asyncHandler = (fn) => async (err, req, res, next) => {
    try {
        await fn(req, res, next)
        console.log('oks')
    } catch (error) {
        res.status(err.code || 500).json({
            success: false,
            message: err.message
        })
    }
}
 
*/ 




