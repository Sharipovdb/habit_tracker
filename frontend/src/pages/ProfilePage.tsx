import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useWatch } from "react-hook-form";
import type { AxiosError } from "axios";
import { getProfile, updateProfile } from "../api/profile";
import { queryKeys } from "../api/queryKeys";
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

function toProfileFormValues(user: User) {
  return {
    name: user.name || "",
    age: user.age?.toString() || "",
    height: user.height?.toString() || "",
    weight: user.weight?.toString() || "",
  };
}

export default function ProfilePage() {
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, control } = useForm<ProfileForm>();
  const profileQuery = useQuery({
    queryKey: queryKeys.profile.current,
    queryFn: getProfile,
  });
  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(queryKeys.profile.current, updatedUser);
      reset(toProfileFormValues(updatedUser));
      setMessage("Profile updated successfully!");
    },
  });

  const user = profileQuery.data ?? null;

  const watchedHeight = useWatch({ control, name: "height" });
  const watchedWeight = useWatch({ control, name: "weight" });
  const bmi = calculateBmi(
    watchedHeight ? Number(watchedHeight) : user?.height,
    watchedWeight ? Number(watchedWeight) : user?.weight
  );
  const bmiCategory = bmi !== null ? getBmiCategory(bmi) : null;

  useEffect(() => {
    if (!user) {
      return;
    }

    reset(toProfileFormValues(user));
  }, [reset, user]);

  const onSubmit = async (data: ProfileForm) => {
    try {
      setMessage("");
      updateProfileMutation.reset();
      await updateProfileMutation.mutateAsync({
        name: data.name || undefined,
        age: data.age ? Number(data.age) : undefined,
        height: data.height ? Number(data.height) : undefined,
        weight: data.weight ? Number(data.weight) : undefined,
      });
    } catch {
      // Error is surfaced through mutation state.
    }
  };

  const mutationError = updateProfileMutation.error as AxiosError<{ error?: string }> | null;
  const error = profileQuery.isError
    ? "Failed to load profile"
    : mutationError?.response?.data?.error || (updateProfileMutation.isError ? "Failed to update profile" : "");

  if (profileQuery.isLoading && !user) {
    return (
      <div>
        <div className="page-header">
          <h2>Profile</h2>
          <p>Manage your personal information</p>
        </div>
        <div className="card">Loading profile...</div>
      </div>
    );
  }

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
            <button type="submit" className="btn btn-primary" disabled={updateProfileMutation.isPending}>
              <Save size={16} /> Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
