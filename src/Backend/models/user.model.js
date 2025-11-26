import mongoose from "mongoose";

const user_schema = new mongoose.Schema({
    name: { type: String, required: true, minlength: 5, trim: true },
    email: { type: String, required: true, trim: true, unique: true },
    password_hash: { type: String, required: true }
});

export const User = mongoose.model("User", user_schema);