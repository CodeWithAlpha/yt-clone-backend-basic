import { JwtPayload } from "jsonwebtoken";

interface accessTokenJwtPayload extends JwtPayload {
  _id: string;
  email: string;
  username: string;
}

interface refreshTokenJwtPayload extends JwtPayload {
  _id: string;
}
