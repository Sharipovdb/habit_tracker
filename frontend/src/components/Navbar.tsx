import { useNavigate } from "react-router-dom";
import { logoutUser } from "../api/auth";

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login");
  };

  return (
    <nav className="nav">
      <h1 onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        Habit Tracker
      </h1>
      <button onClick={handleLogout}>Logout</button>
    </nav>
  );
}
