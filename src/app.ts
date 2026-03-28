import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import config from './app/config';
import globalErrorHandler from './app/middlewares/globalErrorHandlers';
import notFoundHandler from './app/middlewares/notFound';
import router from './app/routes';
import healthRouter from './app/routes/health.routes';
import logger from './app/utils/logger';

const app: Application = express();

app.use(helmet());

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    errorSources: [
      {
        path: '',
        message: `Rate limit exceeded. Try again in ${config.rateLimit.windowMs / 1000 / 60} minutes.`,
      },
    ],
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(compression());

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`,
    );
  });
  next();
});

app.use(healthRouter);

app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Digital Khata Bot API is running',
    version: '1.0.0',
  });
});

app.use('/api/v1', router);

app.use(globalErrorHandler);
app.use(notFoundHandler);

export default app;
