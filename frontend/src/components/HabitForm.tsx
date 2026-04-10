import { useForm } from "react-hook-form";
import type { HabitType } from "../types";

interface FormData {
  title: string;
  type: HabitType;
  target: string;
}

interface Props {
  onSubmit: (data: FormData) => void;
}

export default function HabitForm({ onSubmit }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  const handleFormSubmit = (data: FormData) => {
    onSubmit(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="card">
      <h3 style={{ marginBottom: 16 }}>New Habit</h3>

      <div className="form-group">
        <label>Title</label>
        <input {...register("title", { required: "Title is required" })} placeholder="e.g. Morning Run" />
        {errors.title && <span className="error-message">{errors.title.message}</span>}
      </div>

      <div className="form-group">
        <label>Type</label>
        <select {...register("type", { required: "Type is required" })}>
          <option value="run">Run</option>
          <option value="diet">Diet</option>
          <option value="sleep">Sleep</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="form-group">
        <label>Target (optional)</label>
        <input {...register("target")} placeholder="e.g. 30 min daily" />
      </div>

      <button type="submit" className="btn btn-primary">Create Habit</button>
    </form>
  );
}
