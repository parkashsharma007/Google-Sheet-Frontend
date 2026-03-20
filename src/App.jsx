import { useCallback, useState } from "react";
import Importsheet from "./components/Importsheet";
import TaskList from "./components/TaskList";
import "./index.css";
import AddTaskModal from "./components/AddTaskModal";

function App() {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toasts, setToasts] = useState([]);

  const refreshTasks = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const showToast = useCallback((message, type = "success") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setToasts((currentToasts) => [...currentToasts, { id, message, type }]);

    window.setTimeout(() => {
      setToasts((currentToasts) =>
        currentToasts.filter((toast) => toast.id !== id)
      );
    }, 3000);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4">
        <div className="flex w-full max-w-md flex-col gap-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur ${
                toast.type === "error" ? "bg-red-600/95" : "bg-emerald-600/95"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setIsAddTaskOpen(true)}
            className="rounded-lg bg-green-600 px-5 py-2.5 text-white font-semibold shadow hover:bg-green-700"
          >
            Add Task
          </button>
        </div>

        <Importsheet refreshTasks={refreshTasks} showToast={showToast} />
        <TaskList refreshKey={refreshKey} showToast={showToast} />
        <AddTaskModal
          isOpen={isAddTaskOpen}
          onClose={() => setIsAddTaskOpen(false)}
          refreshTasks={refreshTasks}
          showToast={showToast}
        />
      </div>
    </div>
  );
}

export default App;
