import { Request, Response } from 'express';
import httpStatus from 'http-status';

const notFoundHandler = (req: Request, res: Response) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: 'API endpoint not found',
    errorSources: [
      {
        path: req.originalUrl,
        message: `Cannot ${req.method} ${req.originalUrl}`,
      },
    ],
  });
};

export default notFoundHandler;
