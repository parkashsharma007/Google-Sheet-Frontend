import React, { useEffect, useState } from "react";
import axios from "axios";

const TaskList = ({ refreshKey }) => {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const tasksPerPage = 5;

  const fetchTasks = async () => {
    try {
      setError("");
      const res = await axios.get("https://google-sheet-hkcm.onrender.com/tasks", {
        timeout: 5000,
      });
      setTasks(res.data);
      setCurrentPage(1);
    } catch (err) {
      setTasks([]);
      setCurrentPage(1);
      setError(
        err.response?.data?.message ||
          "Tasks load nahi ho pa rahe. Backend ya database connection check karo."
      );
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [refreshKey]);

  const deleteTask = async (id) => {
    await axios.delete(`https://google-sheet-hkcm.onrender.com/tasks/${id}`);
    fetchTasks();
  };

  const toggleComplete = async (task) => {
    await axios.put(`https://google-sheet-hkcm.onrender.com/tasks/${task._id}`, {
      completed: !task.completed,
    });
    fetchTasks();
  };

  const totalPages = Math.ceil(tasks.length / tasksPerPage);
  const startIndex = (currentPage - 1) * tasksPerPage;
  const currentTasks = tasks.slice(startIndex, startIndex + tasksPerPage);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h2 className="mb-4 text-2xl font-bold">Task List</h2>

      {error && (
        <p className="mb-4 rounded-md bg-red-100 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full overflow-hidden rounded-lg bg-white shadow-md">
          <thead className="bg-gray-200 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Due Date</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-4 text-center text-gray-500">
                  No tasks found
                </td>
              </tr>
            ) : (
              currentTasks.map((task) => (
                <tr
                  key={task._id}
                  className="border-t transition hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium">{task.title}</td>
                  <td className="px-4 py-3">{task.description}</td>
                  <td className="px-4 py-3">{task.dueDate?.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-1 text-sm text-white ${
                        task.completed ? "bg-green-500" : "bg-red-500"
                      }`}
                    >
                      {task.completed ? "Done" : "Pending"}
                    </span>
                  </td>
                  <td className="space-x-2 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleComplete(task)}
                      className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
                    >
                      Toggle
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteTask(task._id)}
                      className="rounded bg-red-500 px-3 py-1 text-white hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            Showing {startIndex + 1} to{" "}
            {Math.min(startIndex + currentTasks.length, tasks.length)} of{" "}
            {tasks.length} tasks
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="rounded border border-gray-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1;

              return (
                <button
                  type="button"
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`rounded px-3 py-1 text-sm ${
                    currentPage === page
                      ? "bg-blue-500 text-white"
                      : "border border-gray-300 text-gray-700"
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="rounded border border-gray-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;
