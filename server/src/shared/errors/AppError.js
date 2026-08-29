export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict detected') {
    super(message, 409)
  }
}
