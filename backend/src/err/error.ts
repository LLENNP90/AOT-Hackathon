import { type Request, type Response, type NextFunction } from 'express';

export class AppError extends Error{
  constructor(
      public statusCode: number,
      public code: string, // pass in string
  ) {
      super(code);
      this.statusCode = statusCode;
  }
}

export const ErrorResponses = {
    SUCCESS: new AppError(200, "SUCCESS"),

    // auth (401)
    INVALID_CREDENTIALS: new AppError(401, 'INVALID_CREDENTIALS'),
    UNAUTHORISED: new AppError(401, 'UNAUTHORISED'), // for stuff youre not allowed to do;
    UNAUTHORISED_TOKEN: new AppError(401, 'UNAUTHORISED_TOKEN'),

    // validation (400)
    MISSING_FIELDS: new AppError(400, 'MISSING_FIELDS'),
    INVALID_FORMAT: new AppError(400, "INVALID_FORMAT"),
    INVALID_EMAIL: new AppError(400, "INVALID_EMAIL"),

    // conflict (409)
    USERNAME_TAKEN: new AppError(409, 'USERNAME_TAKEN'),
    EMAIL_TAKEN: new AppError(409, 'EMAIL_TAKEN'),
    SAVED_ALREADY_EXISTS: new AppError(409, "SAVED_ALREADY_EXISTS"),

    // not found (404)
    USER_NOT_FOUND: new AppError(404, 'USER_NOT_FOUND'),
    SAVED_NOT_FOUND: new AppError(404, "SAVED_NOT_FOUND"),

    // server (500)
    INTERNAL_ERROR: new AppError(500, 'INTERNAL_ERROR'),
}

export const E = (err?: any):never => {
    throw err ?? ErrorResponses.INTERNAL_ERROR; 
}

export const Success = (res: Response, body?: any) => {
    return res.status(200).json({
        success: true,
        code:"SUCCESS",
        ...body
    })
}

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction 
) => {
    console.log("Request URL" ,req.url);
    console.log("Request Body", req.body);

    if (err instanceof AppError){
        if (err.statusCode === 200){
            return Success(res);
        }

        return res.status(err.statusCode).json({
            success: false,
            code: err.code
        })
    }

    return res.status(500).json({
        success: false,
        code: ErrorResponses.INTERNAL_ERROR.code
    })
}

