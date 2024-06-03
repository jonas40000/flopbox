// src/components/Home.tsx
import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import { register, login } from "../api";
import flopboxImg from "../assets/flopbox.jpg";

const Home: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setUser } = useUser();
  const history = useHistory();

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await login(username, password);
      setUser({ username, token });
      history.push("/user");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await register(username, password, accessCode);
      setUser({ username, token });
      history.push("/user");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 72,
      }}
    >
      <img src={flopboxImg} alt="Flopbox" width={400}></img>
      <h3 style={{ marginBottom: 40, marginTop: 40 }}>
        Store your files securely in the Flopbox Cloud!
      </h3>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ marginBottom: "10px", width: "300px" }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ marginBottom: "10px", width: "300px" }}
      />
      <input
        type="text"
        placeholder="Early Access Code (required for Sign Up)"
        value={accessCode}
        onChange={(e) => setAccessCode(e.target.value)}
        style={{ marginBottom: "20px", width: "300px" }}
      />
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={handleSignIn}>Sign In</button>
        <button onClick={handleSignUp}>Sign Up</button>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default Home;
