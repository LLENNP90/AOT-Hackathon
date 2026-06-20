import bcrypt from "bcrypt";
import { prisma } from "../libs/prisma.js";
import { signToken } from "../libs/jwt.js";
import { ErrorResponses } from "../err/error.js";

const USER_SAFE_SELECT = {
  id: true,
  username: true,
  BusinessName: true,
  createdAt: true,
} as const;

interface SignUpInput {
  username: string;
  password: string;
  businessName: string;
}

interface EditUserInput {
  username?: string;
  password?: string;
  businessName?: string;
}

interface AddEmployeeInput {
  name: string;
  role: string;
  hourlyWage: number;
}

interface EditEmployeeInput {
  name?: string;
  role?: string;
  hourlyWage?: number;
}

// ------- USER -------

export class UserService{
    static async login(username: string, password: string){
        const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      throw ErrorResponses.INVALID_CREDENTIALS;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      throw ErrorResponses.INVALID_CREDENTIALS;
    }

    const token = signToken({
      id: user.id,
      username: user.username,
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        businessName: user.BusinessName,
        createdAt: user.createdAt,
      },
    };
  }
 

static async signup(input: SignUpInput) {
  const { username, password, businessName } = input;

  // check existing Username
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUsername) throw ErrorResponses.USERNAME_TAKEN;

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      BusinessName: businessName,
    },
  });

  const token = signToken({
    id: user.id,
    username: user.username,
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      businessName: user.BusinessName,
      createdAt: user.createdAt,
    },
  };
}

static async getMyProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      BusinessName: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw ErrorResponses.USER_NOT_FOUND;
  }

  return user;
}

static async editProfile(id:string,input: EditUserInput){
    const {username, password, businessName} = input;

     if (username) {
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername && existingUsername.id !== id) throw ErrorResponses.USERNAME_TAKEN;
  }


  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      ...(username !== undefined && { username }),
      ...(businessName !== undefined && { BusinessName: businessName }),
    },
    select: {
      id: true,
      username: true,
      BusinessName: true,
      createdAt: true,
    },
  });

  return updatedUser;
}

}



