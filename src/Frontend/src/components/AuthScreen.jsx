import React, { useState } from "react";
import comms from "../api/commsController";

export default function AuthScreen({ setUser, setView }) {
  const [email, setEmail] = useState("captain@cat.com");
  const [pass, setPass] = useState("password123");
  const [displayName, setDisplayName] = useState("");

  const auth = async (endpoint) => {
    try {
      let resData;
      if (endpoint === "register") {
        if (!displayName) return alert("Display Name required!");
        resData = await comms.register(displayName, email, pass);
      } else {
        resData = await comms.login(email, pass);
      }

      const newUser = { _id: resData._id, displayName: resData.displayName };
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser(newUser);
      setView("lobby");
    } catch (e) {
      alert(e.response?.data?.error || "Auth failed");
    }
  };

  return (
    <div className="container">
      <h1>🚀 CATALISM LOGIN</h1>
      <div className="panel">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display Name (Register Only)"
          style={{ marginBottom: "10px", width: "100%" }}
        />
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={{ flex: 1 }}
          />
          <input
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            type="password"
            placeholder="Password"
            style={{ flex: 1 }}
          />
        </div>
        <br />
        <div style={{ display: "flex", gap: "10px" }}>
          <button style={{ flex: 1 }} onClick={() => auth("login")}>Login</button>
          <button style={{ flex: 1, background: "#444400" }} onClick={() => auth("register")}>Register</button>
        </div>
      </div>
    </div>
  );
}