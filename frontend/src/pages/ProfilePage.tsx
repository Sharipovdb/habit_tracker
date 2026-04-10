import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useWatch } from "react-hook-form";
import type { AxiosError } from "axios";
import { getProfile, updateProfile } from "../api/profile";
import type { User } from "../types";
import { Save } from "lucide-react";

interface ProfileForm {
  name: string;
  age: string;
  height: string;
  weight: string;
}

function calculateBmi(heightCm?: number | null, weightKg?: number | null) {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return null;
  }

  const heightInMeters = heightCm / 100;
  return weightKg / (heightInMeters * heightInMeters);
}

function getBmiCategory(bmi: number) {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { register, handleSubmit, reset, control } = useForm<ProfileForm>();

  const watchedHeight = useWatch({ control, name: "height" });
  const watchedWeight = useWatch({ control, name: "weight" });
  const bmi = calculateBmi(
    watchedHeight ? Number(watchedHeight) : user?.height,
    watchedWeight ? Number(watchedWeight) : user?.weight
  );
  const bmiCategory = bmi !== null ? getBmiCategory(bmi) : null;

  useEffect(() => {
    getProfile()
      .then((u) => {
        setUser(u);
        reset({
          name: u.name || "",
          age: u.age?.toString() || "",
          height: u.height?.toString() || "",
          weight: u.weight?.toString() || "",
        });
      })
      .catch(() => setError("Failed to load profile"));
  }, [reset]);

  const onSubmit = async (data: ProfileForm) => {
    try {
      setError("");
      setMessage("");
      const updated = await updateProfile({
        name: data.name || undefined,
        age: data.age ? Number(data.age) : undefined,
        height: data.height ? Number(data.height) : undefined,
        weight: data.weight ? Number(data.weight) : undefined,
      });
      setUser(updated);
      reset({
        name: updated.name || "",
        age: updated.age?.toString() || "",
        height: updated.height?.toString() || "",
        weight: updated.weight?.toString() || "",
      });
      setMessage("Profile updated successfully!");
    } catch (err: unknown) {
      const apiError = err as AxiosError<{ error?: string }>;
      setError(apiError.response?.data?.error || "Failed to update profile");
    }
  };

  const initials = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "?";

  return (
    <div>
      <div className="page-header">
        <h2>Profile</h2>
        <p>Manage your personal information</p>
      </div>

      <div className="card-grid card-grid-2">
        {/* Profile card */}
        <div className="card" style={{ textAlign: "center", paddingTop: 40, paddingBottom: 40 }}>
          <div className="profile-avatar">{initials}</div>
          <h3 style={{ marginBottom: 4 }}>{user?.name || "No name set"}</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{user?.email}</p>
          <div className="profile-metrics">
            <div className="profile-metric">
              <div className="profile-metric-value">
                {user?.age || "—"}
              </div>
              <div className="profile-metric-label">Age</div>
            </div>
            <div className="profile-metric">
              <div className="profile-metric-value">
                {user?.height ? `${user.height}cm` : "—"}
              </div>
              <div className="profile-metric-label">Height</div>
            </div>
            <div className="profile-metric">
              <div className="profile-metric-value">
                {user?.weight ? `${user.weight}kg` : "—"}
              </div>
              <div className="profile-metric-label">Weight</div>
            </div>
            <div className="profile-metric">
              <div className="profile-metric-value">
                {bmi !== null ? bmi.toFixed(1) : "—"}
              </div>
              <div className="profile-metric-label">BMI</div>
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div className="card">
          <div className="card-header">
            <h3>Edit Profile</h3>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="bmi-panel">
              <div className="bmi-panel-header">
                <div>
                  <div className="bmi-value">{bmi !== null ? bmi.toFixed(1) : "—"}</div>
                  <div className="bmi-note">BMI is calculated automatically from your height and weight.</div>
                </div>
                {bmiCategory && <span className="bmi-category">{bmiCategory}</span>}
              </div>
            </div>
            <div className="form-group">
              <label>Name</label>
              <input type="text" placeholder="Your name" {...register("name")} />
            </div>
            <div className="form-group">
              <label>Age</label>
              <input type="number" placeholder="25" {...register("age")} />
            </div>
            <div className="form-group">
              <label>Height (cm)</label>
              <input type="number" placeholder="175" {...register("height")} />
            </div>
            <div className="form-group">
              <label>Weight (kg)</label>
              <input type="number" step="0.1" placeholder="70" {...register("weight")} />
            </div>
            <button type="submit" className="btn btn-primary">
              <Save size={16} /> Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
