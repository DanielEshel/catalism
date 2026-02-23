const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require('../logic/userLogic');

// --- HTTP AUTH (REST API) ---
const protect = (req, res, next) => {
  // 1. Read the token from the HTTP-only cookie
  const token = req.cookies?.token; 

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
    // Read the raw cookie header from the websocket handshake
    const cookieString = socket.request.headers.cookie;
    if (!cookieString) return next(new Error("Auth Error: No Token Provided"));

    // Extract the token from the cookie string
    const tokenMatch = cookieString.match(/(?:^|; )token=([^;]*)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    
    if (!token) return next(new Error("Auth Error: No Token Provided"));
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.data.userId = decoded.id; 
        next();
    } catch (err) {
        next(new Error("Auth Error: Invalid Token"));
    }
};

module.exports = { protect, socketAuth };