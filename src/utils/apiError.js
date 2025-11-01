class apiError extends Error {
    constructor(
        statusCode,
        message = "something went wrong",
        error = [],
        stack = ""
    ){
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.success = false;
        this.error = error;

        if (stack) {   // if stack is provided use that else create a new stack trace 
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor); // creates a new stack trace , what does this do ? this helps in debugging by providing information about where the error occurred in the code.
        }

    }
}
export default apiError;

// what does this file do ?
//this file exports a custom error class that extends the built-in Error class. It adds additional properties like statusCode, data, error, and stack to the error object. This allows for more structured error handling and standardized error responses in the API.

// is it stack or statck ?
// it is stack , corrected the typo in the code above