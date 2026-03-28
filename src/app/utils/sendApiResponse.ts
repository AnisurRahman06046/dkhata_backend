import { Response } from 'express';

const sendApiResponse = <T>(
  res: Response,
  code: number,
  message: string,
  data: T,
) => {
  return res.status(code).json({
    success: true,
    message,
    data,
  });
};

export default sendApiResponse;
