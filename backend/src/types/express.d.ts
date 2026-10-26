declare global {
  namespace Express {
    interface Request {
      user?: any;
      projectRole?: import("../utils/constants.js").UserRole;
    }
  }
}

export {};
