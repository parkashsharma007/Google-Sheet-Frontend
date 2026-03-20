import React, { useEffect, useState } from "react";
import axios from "axios";

const TaskList = ({ refreshKey }) => {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");

  // 🔹 Fetch tasks
  const fetchTasks = async () => {
    try {
      setError("");
      const res = await axios.get("http://localhost:5000/tasks", {
        timeout: 5000,
      });
      setTasks(res.data);
    } catch (err) {
      setTasks([]);
      setError(
        err.response?.data?.message ||
          "Tasks load nahi ho pa rahe. Backend ya database connection check karo."
      );
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [refreshKey]);

  // 🔹 Delete task
  const deleteTask = async (id) => {
    await axios.delete(`http://localhost:5000/tasks/${id}`);
    fetchTasks();
  };

  // 🔹 Toggle complete
  const toggleComplete = async (task) => {
    await axios.put(`http://localhost:5000/tasks/${task._id}`, {
      completed: !task.completed,
    });
    fetchTasks();
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h2 className="text-2xl font-bold mb-4">📋 Task List</h2>

      {error && (
        <p className="mb-4 rounded-md bg-red-100 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
          
          {/* Header */}
          <thead className="bg-gray-200 text-gray-700">
            <tr>
              <th className="py-3 px-4 text-left">Title</th>
              <th className="py-3 px-4 text-left">Description</th>
              <th className="py-3 px-4 text-left">Due Date</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-4 text-gray-500">
                  No tasks found 🚫
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr
                  key={task._id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="py-3 px-4 font-medium">{task.title}</td>
                  <td className="py-3 px-4">{task.description}</td>
                  <td className="py-3 px-4">
                    {task.dueDate?.slice(0, 10)}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded text-white text-sm ${
                        task.completed
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                    >
                      {task.completed ? "Done" : "Pending"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 space-x-2">
                    <button
                      onClick={() => toggleComplete(task)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                    >
                      Toggle
                    </button>

                    <button
                      onClick={() => deleteTask(task._id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
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
    </div>
  );
};

export default TaskList;
