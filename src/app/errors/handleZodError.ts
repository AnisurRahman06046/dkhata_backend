import { ZodError, ZodIssue } from 'zod';
import httpStatus from 'http-status';
import { IErrorResponse, IErrorSource } from '../interfaces/error.interface';

const handleZodError = (error: ZodError): IErrorResponse => {
  const errorSources: IErrorSource[] = error.issues.map((issue: ZodIssue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: 'Validation Error',
    errorSources,
  };
};

export default handleZodError;
