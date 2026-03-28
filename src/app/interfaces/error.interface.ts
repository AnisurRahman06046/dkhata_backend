export interface IErrorSource {
  path: string;
  message: string;
}

export interface IErrorResponse {
  statusCode: number;
  message: string;
  errorSources: IErrorSource[];
}
