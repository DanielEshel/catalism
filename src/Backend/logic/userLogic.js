const { User } = require("../models/Schemas");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL ERROR: JWT_SECRET is not defined.");
  process.exit(1);
}

const validateDisplayname = (name) => {
  const cleaned = String(name || "").trim();
  if (cleaned.length < 3 || cleaned.length > 20) {
    throw new Error("Display name must be between 3 and 20 characters.");
  }
  if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) {
    throw new Error(
      "Display name can only contain letters, numbers, and underscores.",
    );
  }
  return cleaned;
};

const validateEmail = (email) => {
  const cleaned = String(email || "")
    .trim()
    .toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) throw new Error("Invalid email format.");
  return cleaned;
};

const validatePassword = (pass) => {
  const cleaned = String(pass || "");
  if (cleaned.length < 6 || cleaned.length > 30) {
    throw new Error("Password must be between 6 and 30 characters.");
  }
  return cleaned;
};

// --- HELPER: GENERATE TOKEN ---
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "1d" });
};
/**
 **  Register a new user after validating inputs
 * @param {*} userData
 * @returns Newly created user object
 */
const registerUser = async (userData) => {
  const email = validateEmail(userData.email);
  const displayName = validateDisplayname(userData.displayName);
  const password = validatePassword(userData.password);

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error("A kitten with this email already exists.");

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = new User({
    displayName,
    email,
    passwordHash: hashedPassword,
    wins: 0,
    losses: 0,
  });

  const savedUser = await newUser.save();

  // Return the Token + User Info
  return {
    _id: savedUser._id,
    displayName: savedUser.displayName,
    token: generateToken(savedUser._id), // <--- KEY CHANGE
  };
};

/**
 **  Authenticate user and return user object without passwordHash
 * @param {*} credentials
 * @returns Authenticated user object
 */
const loginUser = async (credentials) => {
  const email = validateEmail(credentials.email);
  const password = String(credentials.password || "");

  const user = await User.findOne({ email });
  if (!user) throw new Error("Invalid email or password.");

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new Error("Invalid email or password.");

  // Return the Token + User Info
  return {
    _id: user._id,
    displayName: user.displayName,
    token: generateToken(user._id), // <--- KEY CHANGE
  };
};

module.exports = { registerUser, loginUser, JWT_SECRET };
