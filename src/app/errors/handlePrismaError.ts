import { Prisma } from '../../../generated/prisma/client';
import httpStatus from 'http-status';
import { IErrorResponse, IErrorSource } from '../interfaces/error.interface';

export const handlePrismaClientKnownRequestError = (
  error: Prisma.PrismaClientKnownRequestError,
): IErrorResponse => {
  let statusCode: number = httpStatus.BAD_REQUEST;
  let message = 'Database Error';
  let errorSources: IErrorSource[] = [];

  switch (error.code) {
    case 'P2002': {
      const target = (error.meta?.target as string[]) || ['field'];
      statusCode = httpStatus.CONFLICT;
      message = 'Duplicate entry';
      errorSources = [
        {
          path: target.join(', '),
          message: `A record with this ${target.join(', ')} already exists`,
        },
      ];
      break;
    }

    case 'P2001':
    case 'P2025': {
      statusCode = httpStatus.NOT_FOUND;
      message = 'Record not found';
      errorSources = [
        {
          path: '',
          message:
            (error.meta?.cause as string) ||
            'The requested record does not exist',
        },
      ];
      break;
    }

    case 'P2003': {
      statusCode = httpStatus.BAD_REQUEST;
      message = 'Foreign key constraint failed';
      errorSources = [
        {
          path: (error.meta?.field_name as string) || '',
          message: 'Related record not found',
        },
      ];
      break;
    }

    case 'P2012': {
      statusCode = httpStatus.BAD_REQUEST;
      message = 'Missing required field';
      errorSources = [
        {
          path: (error.meta?.path as string) || '',
          message: 'A required field is missing',
        },
      ];
      break;
    }

    case 'P2006': {
      statusCode = httpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
      errorSources = [
        {
          path: (error.meta?.model_name as string) || '',
          message: `Invalid value for ${error.meta?.field_name || 'field'}`,
        },
      ];
      break;
    }

    default: {
      message = 'Database operation failed';
      errorSources = [
        {
          path: '',
          message: error.message,
        },
      ];
    }
  }

  return { statusCode, message, errorSources };
};

export const handlePrismaClientValidationError = (
  error: Prisma.PrismaClientValidationError,
): IErrorResponse => {
  const errorSources: IErrorSource[] = [
    {
      path: '',
      message: error.message.split('\n').pop() || 'Validation error',
    },
  ];

  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: 'Validation Error',
    errorSources,
  };
};

export const handlePrismaClientInitializationError = (
  _error: Prisma.PrismaClientInitializationError,
): IErrorResponse => {
  return {
    statusCode: httpStatus.SERVICE_UNAVAILABLE,
    message: 'Database connection failed',
    errorSources: [
      {
        path: '',
        message:
          'Unable to connect to the database. Please try again later.',
      },
    ],
  };
};

export const handlePrismaClientRustPanicError = (
  _error: Prisma.PrismaClientRustPanicError,
): IErrorResponse => {
  return {
    statusCode: httpStatus.INTERNAL_SERVER_ERROR,
    message: 'Database engine error',
    errorSources: [
      {
        path: '',
        message: 'An unexpected database error occurred',
      },
    ],
  };
};
