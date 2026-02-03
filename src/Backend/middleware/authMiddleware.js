// src/Backend/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require('../logic/userLogic');

// --- HTTP AUTH (REST API) ---
const protect = (req, res, next) => {
  let token;
  
  // 1. Check for Bearer Token
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
      return res.status(401).json({ error: "Not authorized, no token" });
  }

  // 2. Verify Token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.id }; // Attach user ID to request
    next();
  } catch (error) {
    res.status(401).json({ error: "Not authorized, token failed" });
  }
};

// --- SOCKET AUTH (Real-Time) ---
const socketAuth = (socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) return next(new Error("Auth Error: No Token Provided"));
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.data.userId = decoded.id; // Attach user ID to socket session
        next();
    } catch (err) {
        next(new Error("Auth Error: Invalid Token"));
    }
};

module.exports = { protect, socketAuth };