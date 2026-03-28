import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../../../generated/prisma/client';
import httpStatus from 'http-status';
import config from '../config';
import AppError from '../errors/AppError';
import handleZodError from '../errors/handleZodError';
import {
  handlePrismaClientKnownRequestError,
  handlePrismaClientValidationError,
  handlePrismaClientInitializationError,
  handlePrismaClientRustPanicError,
} from '../errors/handlePrismaError';
import { IErrorSource } from '../interfaces/error.interface';

const globalErrorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let message: string = 'Something went wrong';
  let errorSources: IErrorSource[] = [
    {
      path: '',
      message: 'Something went wrong',
    },
  ];

  if (error instanceof ZodError) {
    const simplifiedError = handleZodError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const simplifiedError = handlePrismaClientKnownRequestError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources;
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    const simplifiedError = handlePrismaClientValidationError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources;
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    const simplifiedError = handlePrismaClientInitializationError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources;
  } else if (error instanceof Prisma.PrismaClientRustPanicError) {
    const simplifiedError = handlePrismaClientRustPanicError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorSources = simplifiedError.errorSources;
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    errorSources = error.errorSources.length
      ? error.errorSources
      : [{ path: '', message: error.message }];
  } else if (error instanceof Error) {
    message = error.message;
    errorSources = [
      {
        path: '',
        message: error.message,
      },
    ];
  }

  if (config.node_env === 'development') {
    console.error('Error:', {
      statusCode,
      message,
      errorSources,
      stack: error?.stack,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    ...(config.node_env === 'development' && { stack: error?.stack }),
  });
};

export default globalErrorHandler;
