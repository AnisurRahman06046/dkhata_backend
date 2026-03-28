import httpStatus from 'http-status';

class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errorSources: { path: string; message: string }[];

  constructor(
    statusCode: number,
    message: string,
    errorSources: { path: string; message: string }[] = [],
    isOperational = true,
    stack = '',
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorSources = errorSources;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class BadRequestError extends AppError {
  constructor(
    message = 'Bad Request',
    errorSources: { path: string; message: string }[] = [],
  ) {
    super(httpStatus.BAD_REQUEST, message, errorSources);
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    message = 'Unauthorized',
    errorSources: { path: string; message: string }[] = [],
  ) {
    super(httpStatus.UNAUTHORIZED, message, errorSources);
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message = 'Forbidden',
    errorSources: { path: string; message: string }[] = [],
  ) {
    super(httpStatus.FORBIDDEN, message, errorSources);
  }
}

export class NotFoundError extends AppError {
  constructor(
    message = 'Resource not found',
    errorSources: { path: string; message: string }[] = [],
  ) {
    super(httpStatus.NOT_FOUND, message, errorSources);
  }
}

export class ConflictError extends AppError {
  constructor(
    message = 'Conflict',
    errorSources: { path: string; message: string }[] = [],
  ) {
    super(httpStatus.CONFLICT, message, errorSources);
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Validation Error',
    errorSources: { path: string; message: string }[] = [],
  ) {
    super(httpStatus.UNPROCESSABLE_ENTITY, message, errorSources);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(
    message = 'Too many requests',
    errorSources: { path: string; message: string }[] = [],
  ) {
    super(httpStatus.TOO_MANY_REQUESTS, message, errorSources);
  }
}

export class InternalServerError extends AppError {
  constructor(
    message = 'Internal Server Error',
    errorSources: { path: string; message: string }[] = [],
  ) {
    super(httpStatus.INTERNAL_SERVER_ERROR, message, errorSources, false);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(
    message = 'Service Unavailable',
    errorSources: { path: string; message: string }[] = [],
  ) {
    super(httpStatus.SERVICE_UNAVAILABLE, message, errorSources);
  }
}

export default AppError;
