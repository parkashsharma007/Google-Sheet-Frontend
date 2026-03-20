import { useState } from "react";
import Importsheet from "./components/Importsheet";
import TaskList from "./components/TaskList";
import "./index.css";
import AddTaskModal from "./components/AddTaskModal";


function App() {
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshTasks = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-100">
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

        <Importsheet refreshTasks={refreshTasks} />
        <TaskList refreshKey={refreshKey} />
        <AddTaskModal
          isOpen={isAddTaskOpen}
          onClose={() => setIsAddTaskOpen(false)}
          refreshTasks={refreshTasks}
        />
      </div>
    </div>
  );
}

export default App;
