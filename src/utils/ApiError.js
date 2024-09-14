class ApiError extends Error {
  constructor(statusCode, message = "Something went wrong") {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
  }
}

const handleError = (err, res) => {
  if (err instanceof ApiError) {
    // Handle custom ApiError
    const { statusCode, message, data, success } = err;
    return res.status(statusCode).json({
      statusCode,
      success,
      message,
      data,
    });
  }

  // Fallback for other errors
  return res.status(500).json({
    statusCode: 500,
    success: false,
    message: "Internal Server Error",
    data: null,
  });
};

export { ApiError, handleError };
