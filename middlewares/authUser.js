import jwt from "jsonwebtoken";

// User authentication middleware
const authUser = async (req, res, next) => {
  try {
    const { token } = req.headers;
    console.log("Token received:", token);
    console.log("JWT_SECRET:", process.env.JWT_SECRET);

    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized: Token missing" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.body.userId = decoded.id;
    next();
  } catch (error) {
    console.error("JWT verification error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired. Please login again." });
    }

    return res.status(403).json({ success: false, message: "Invalid token. Access denied." });
  }
};

export default authUser;
