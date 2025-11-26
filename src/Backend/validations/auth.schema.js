import * as z from "zod";

export const signup_schema = z.object({
    name: z.string().min(5, "The name must contain at least 5 characters"),
    email: z.string().email("Invalid email"),
    password: z.string()
        .min(8, "Password must be at least 8 charcters long ")
        .regex(/\d/, "Password must contain a number")
        .regex(/[^A-Za-z0-9]/, "Password must contain a special character")
});

export const login_schema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(1, "Please enter password")
});