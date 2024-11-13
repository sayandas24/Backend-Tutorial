/*
 1-> By extending Error, ApiError inherits the properties and methods of Error, such as message and stack.

 2-> super(message) calls the constructor of the parent class (Error) and sets the message property on Error.

 EXAMPLE 
 3-> In the ApiError code, this refers to the current instance of the ApiError class. When you create a new ApiError object (e.g., new ApiError(404, "Not Found")), this refers to that specific instance of ApiError.

*/ 

class ApiError extends Error{
    constructor(
        statusCode,
        message = "Something went wrong!!",
        errors = [],
        stack = "",
    ){
        super(message)
        this.data = null
        this.success = false,
        this.statusCode = statusCode,
        this.message = message,
        this.errors = errors

        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export { ApiError }