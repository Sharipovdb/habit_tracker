import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { registerUser } from "../api/auth";
import { Zap } from "lucide-react";
import { authClient } from "../lib/auth-client";

interface FormData {
  name: string;
  email: string;
  password: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  if (!isPending && session) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      setError("");
      await registerUser(data.name, data.email, data.password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo">
          <div className="logo-icon"><Zap size={24} /></div>
          <h2>Create Account</h2>
          <p>Start tracking your habits today</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="card">
          <div className="form-group">
            <label>Name</label>
            <input type="text" placeholder="Alex" {...register("name", { required: "Name required" })} />
            {errors.name && <span className="error-message">{errors.name.message}</span>}
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" {...register("email", { required: "Email required" })} />
            {errors.email && <span className="error-message">{errors.email.message}</span>}
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Min. 6 characters"
              {...register("password", {
                required: "Password required",
                minLength: { value: 6, message: "Min 6 characters" },
              })}
            />
            {errors.password && <span className="error-message">{errors.password.message}</span>}
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={isSubmitting}>
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>
        <div className="link">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
