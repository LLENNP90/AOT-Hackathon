import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error("JWT_SECRET is not set");
}

export type JwtPayload = {
  id: string;
  username: string;
};

export const signToken = (payload: JwtPayload) => {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" }); //7 days
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, SECRET) as JwtPayload;
};
