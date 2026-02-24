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
    try {
        // Read the raw cookie header from the websocket handshake
        const cookieString = socket.request.headers.cookie;
        if (!cookieString) {
            return next(new Error("Authentication required"));
        }

        // Extract the token using split() instead of Regex for better reliability
        const token = cookieString
            .split(';')
            .find(c => c.trim().startsWith('token='))
            ?.split('=')[1];
        
        if (!token) {
            return next(new Error("Authentication required"));
        }
        
        // Verify Token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Attach user ID to the socket for use in handleClientStream
        socket.data.userId = decoded.id; 
        next();
    } catch (err) {
        console.error(`[SOCKET AUTH ERROR]: ${err.message}`);
        next(new Error("Invalid or expired session"));
    }
};

module.exports = { protect, socketAuth };
