class ApiError extends error{
    constructor(
        stausCode,
        message= "something went wrong",
        error = [],
        statck =""

    ){
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false;
        this.errors = errors



        if (statck) {
            this.stack = statck
            
        }else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export {ApiError}