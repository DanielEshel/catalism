import bcrypt from "bcrypt";
import { User } from "../models/user.model.js"
import { signup_schema, login_schema } from "../validations/auth.schema.js";

export async function signup(req, res) {
    try {
        const parsed = signup_schema.parse(req.body);
        const exists = await User.findOne({ email: parsed.email });
        if (exists)
            return res.status(409).json({ success: false, error: "Email already exists"});

        const hash = await bcrypt.hash(parsed.password, 10);
        const user = await User.create({
            name: parsed.name,
            email: parsed.email,
            password_hash: hash
        });

        return res.status(201).json({
            success: true,
            user: { name: parsed.name, email: parsed.email }
        })
    } catch (err) {
        if (err === "ZodError") 
            return res.status(400).
            json({ success: false, error: err.errors.map(e => e.message)});
        return res.status(500).json({ success: false, error: "Server Error" });
    }
}

export async function login(req, res) {
    try{
        const parsed = login_schema.parse(req.body);
        const user = await User.findOne({ email: parsed.email });
        if (!user)
            return res.status(401).json({ success: false, error: "Invalid credentials"});

        const is_valid = await bcrypt.compare(parsed.password, user.password_hash);
        if (!is_valid)
            return res.status(401).json({success: false, error: "Invalid credentials"});

        return res.status(200).json({
            success: true,
            user: { name: user.name, email: user.email }
        });
    } catch(err) {
        if (err.name === "ZodError")
            return res.status(400).
            json({ success: false, error: err.errors.map(e => e.message)});
        return res.status(500).json({ success:false, error: "Server Error" });
    }
}