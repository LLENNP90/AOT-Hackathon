import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../libs/jwt.js";
import { ErrorResponses } from "../err/error.js"

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")){
        throw ErrorResponses.UNAUTHORISED;
    }

    const token = header.split(" ")[1];

    if (!token){
        throw ErrorResponses.UNAUTHORISED_TOKEN;
    }

    try{
        const payload = verifyToken(token);
        req.user = payload;
        next();
    } catch(err) {
        throw ErrorResponses.UNAUTHORISED_TOKEN;
    }
}