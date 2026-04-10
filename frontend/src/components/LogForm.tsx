import { useForm } from "react-hook-form";
import type { HabitType } from "../types";

interface Props {
  habitType: HabitType;
  onSubmit: (data: Record<string, unknown>) => void;
}

export default function LogForm({ habitType, onSubmit }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const handleFormSubmit = (data: Record<string, unknown>) => {
    // Convert numeric fields
    const parsed = { ...data };
    if (habitType === "run") {
      parsed.minutes = Number(parsed.minutes);
      parsed.intensity = Number(parsed.intensity);
    } else if (habitType === "diet") {
      parsed.score = Number(parsed.score);
    } else if (habitType === "sleep") {
      parsed.sleepHours = Number(parsed.sleepHours);
    } else if (habitType === "other") {
      parsed.completed = parsed.completed === "true" || parsed.completed === true;
    }
    onSubmit(parsed);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="card">
      <h3 style={{ marginBottom: 16 }}>Log Today</h3>

      {habitType === "run" && (
        <>
          <div className="form-group">
            <label>Minutes</label>
            <input type="number" {...register("minutes", { required: "Required", min: 0 })} />
            {errors.minutes && <span className="error-message">Required</span>}
          </div>
          <div className="form-group">
            <label>Intensity (1-10)</label>
            <input type="number" {...register("intensity", { required: "Required", min: 1, max: 10 })} />
            {errors.intensity && <span className="error-message">1-10 required</span>}
          </div>
        </>
      )}

      {habitType === "diet" && (
        <>
          <div className="form-group">
            <label>Score (1-10)</label>
            <input type="number" {...register("score", { required: "Required", min: 1, max: 10 })} />
            {errors.score && <span className="error-message">1-10 required</span>}
          </div>
          <div className="form-group">
            <label>Note (optional)</label>
            <textarea {...register("note")} rows={2} />
          </div>
        </>
      )}

      {habitType === "sleep" && (
        <div className="form-group">
          <label>Sleep Hours</label>
          <input type="number" step="0.5" {...register("sleepHours", { required: "Required", min: 0, max: 24 })} />
          {errors.sleepHours && <span className="error-message">0-24 required</span>}
        </div>
      )}

      {habitType === "other" && (
        <div className="form-group">
          <label>Completed?</label>
          <select {...register("completed", { required: true })}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
      )}

      <button type="submit" className="btn btn-primary">Submit Log</button>
    </form>
  );
}
