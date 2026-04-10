import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../api/auth";
import { Zap } from "lucide-react";

interface FormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    try {
      setError("");
      const res = await loginUser(data.email, data.password);
      localStorage.setItem("token", res.token);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo">
          <div className="logo-icon"><Zap size={24} /></div>
          <h2>Welcome Back</h2>
          <p>Sign in to your HabitTracker account</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="card">
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" {...register("email", { required: "Email required" })} />
            {errors.email && <span className="error-message">{errors.email.message}</span>}
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="••••••••" {...register("password", { required: "Password required" })} />
            {errors.password && <span className="error-message">{errors.password.message}</span>}
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Sign In</button>
        </form>
        <div className="link">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
