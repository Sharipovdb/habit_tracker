import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useWatch } from "react-hook-form";
import type { AxiosError } from "axios";
import { deleteProfileAvatar, getProfile, updateProfile, uploadProfileAvatar } from "../api/profile";
import { queryKeys } from "../api/queryKeys";
import type { User } from "../types";
import { Plus, Save, Trash2 } from "lucide-react";

interface ProfileForm {
  name: string;
  age: string;
  height: string;
  weight: string;
  notificationEmail: string;
  reminderEnabled: boolean;
  timezone: string;
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

function toProfileFormValues(user: User, browserTimeZone: string) {
  return {
    name: user.name || "",
    age: user.age?.toString() || "",
    height: user.height?.toString() || "",
    weight: user.weight?.toString() || "",
    notificationEmail: user.notificationEmail || "",
    reminderEnabled: user.reminderEnabled,
    timezone: user.timezone && user.timezone !== "UTC" ? user.timezone : browserTimeZone,
  };
}

export default function ProfilePage() {
  const [message, setMessage] = useState("");
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const { register, handleSubmit, reset, control } = useForm<ProfileForm>();
  const profileQuery = useQuery({
    queryKey: queryKeys.profile.current,
    queryFn: getProfile,
  });

  const syncProfile = (updatedUser: User, successMessage: string) => {
    queryClient.setQueryData(queryKeys.profile.current, updatedUser);
    reset(toProfileFormValues(updatedUser, browserTimeZone));
    setMessage(successMessage);
  };

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      syncProfile(updatedUser, "Profile updated successfully!");
    },
  });
  const uploadAvatarMutation = useMutation({
    mutationFn: uploadProfileAvatar,
    onSuccess: (updatedUser) => {
      syncProfile(updatedUser, "Avatar updated successfully!");
    },
  });
  const deleteAvatarMutation = useMutation({
    mutationFn: deleteProfileAvatar,
    onSuccess: (updatedUser) => {
      syncProfile(updatedUser, "Avatar removed successfully!");
    },
  });

  const user = profileQuery.data ?? null;

  const watchedHeight = useWatch({ control, name: "height" });
  const watchedWeight = useWatch({ control, name: "weight" });
  const watchedReminderEnabled = useWatch({ control, name: "reminderEnabled" });
  const bmi = calculateBmi(
    watchedHeight ? Number(watchedHeight) : user?.height,
    watchedWeight ? Number(watchedWeight) : user?.weight
  );
  const bmiCategory = bmi !== null ? getBmiCategory(bmi) : null;

  useEffect(() => {
    if (!user) {
      return;
    }

    reset(toProfileFormValues(user, browserTimeZone));
  }, [browserTimeZone, reset, user]);

  const onSubmit = async (data: ProfileForm) => {
    try {
      setMessage("");
      updateProfileMutation.reset();
      uploadAvatarMutation.reset();
      deleteAvatarMutation.reset();
      await updateProfileMutation.mutateAsync({
        name: data.name || undefined,
        age: data.age ? Number(data.age) : undefined,
        height: data.height ? Number(data.height) : undefined,
        weight: data.weight ? Number(data.weight) : undefined,
        notificationEmail: data.notificationEmail.trim() ? data.notificationEmail.trim() : null,
        reminderEnabled: data.reminderEnabled,
        timezone: data.timezone.trim() || browserTimeZone,
      });
    } catch {
      // Error is surfaced through mutation state.
    }
  };

  const onAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      setMessage("");
      updateProfileMutation.reset();
      uploadAvatarMutation.reset();
      deleteAvatarMutation.reset();
      await uploadAvatarMutation.mutateAsync(file);
    } catch {
      // Error is surfaced through mutation state.
    }
  };

  const onAvatarUploadClick = () => {
    if (uploadAvatarMutation.isPending || deleteAvatarMutation.isPending) {
      return;
    }

    avatarInputRef.current?.click();
  };

  const onAvatarDelete = async () => {
    try {
      setMessage("");
      updateProfileMutation.reset();
      uploadAvatarMutation.reset();
      deleteAvatarMutation.reset();
      await deleteAvatarMutation.mutateAsync();
    } catch {
      // Error is surfaced through mutation state.
    }
  };

  const mutationError = updateProfileMutation.error as AxiosError<{ error?: string }> | null;
  const uploadAvatarError = uploadAvatarMutation.error as AxiosError<{ error?: string }> | null;
  const deleteAvatarError = deleteAvatarMutation.error as AxiosError<{ error?: string }> | null;
  const error = profileQuery.isError
    ? "Failed to load profile"
    : uploadAvatarError?.response?.data?.error
      || deleteAvatarError?.response?.data?.error
      || mutationError?.response?.data?.error
      || (uploadAvatarMutation.isError
        ? "Failed to update avatar"
        : deleteAvatarMutation.isError
          ? "Failed to remove avatar"
          : updateProfileMutation.isError
            ? "Failed to update profile"
            : "");

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

  const isAvatarBusy = uploadAvatarMutation.isPending || deleteAvatarMutation.isPending;
  const avatarAlt = `${user?.name || user?.email || "User"} avatar`;

  return (
    <div>
      <div className="page-header">
        <h2>Profile</h2>
        <p>Manage your personal information</p>
      </div>

      <div className="card-grid card-grid-2">
        <div className="card profile-card">
          <div className={`profile-avatar-shell${user?.image ? " has-image" : " is-empty"}`}>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="profile-avatar-input"
              onChange={onAvatarChange}
            />
            {user?.image ? (
              <>
                <div className={`profile-avatar profile-avatar-filled${isAvatarBusy ? " is-busy" : ""}`}>
                  <img src={user.image} alt={avatarAlt} className="profile-avatar-image" />
                </div>
                <button
                  type="button"
                  className="btn btn-danger btn-icon profile-avatar-delete"
                  onClick={onAvatarDelete}
                  disabled={isAvatarBusy}
                  aria-label="Delete profile avatar"
                >
                  <Trash2 size={18} />
                </button>
              </>
            ) : (
              <button
                type="button"
                className={`profile-avatar profile-avatar-upload${isAvatarBusy ? " is-busy" : ""}`}
                onClick={onAvatarUploadClick}
                disabled={isAvatarBusy}
                aria-label="Upload profile avatar"
              >
                <Plus size={44} strokeWidth={2.25} />
              </button>
            )}
          </div>
          <h3 style={{ marginBottom: 4 }}>{user?.name || "No name set"}</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: 4 }}>
            Account email: {user?.email}
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Notification email: {user?.notificationEmail || "not set"}
          </p>
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
            <div className="form-group">
              <label>Notification Email</label>
              <input type="email" placeholder="notify@example.com" {...register("notificationEmail")} />
            </div>
            <div className="form-group">
              <label>Timezone</label>
              <input type="text" placeholder="Europe/Moscow" {...register("timezone")} />
              <small style={{ color: "var(--text-secondary)" }}>Detected browser timezone: {browserTimeZone}</small>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <input type="checkbox" {...register("reminderEnabled")} />
              <span>Email me when profile changes are saved.</span>
            </label>
            {watchedReminderEnabled && !user?.notificationEmail && (
              <p style={{ marginTop: -4, marginBottom: 16, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                Notifications are sent immediately to the email set in this profile, not to the registration email.
              </p>
            )}
            <button type="submit" className="btn btn-primary" disabled={updateProfileMutation.isPending}>
              <Save size={16} /> Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
