import { useState } from "react";
import { createTask } from "../lib/api";

const AddTaskModal = ({ isOpen, onClose, refreshTasks, showToast }) => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueDate: "",
  });
  const [error, setError] = useState("");
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");
      await createTask(form);

      refreshTasks?.();
      onClose();
      showToast?.("New task successfully add ho gaya.");

      setForm({ title: "", description: "", dueDate: "" });
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Task save nahi hua. Backend server ya database connection check karo.";
      setError(errorMessage);
      showToast?.(errorMessage, "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
      
      <div className="bg-white p-6 rounded-lg w-[400px] shadow-lg">
        <h2 className="text-xl font-bold mb-4">➕ Add New Task</h2>

        {error && (
          <p className="mb-3 rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          
          {/* Title */}
          <input
            type="text"
            name="title"
            placeholder="Title"
            value={form.title}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded"
          />

          {/* Description */}
          <input
            type="text"
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />

          {/* Due Date */}
          <input
            type="date"
            name="dueDate"
            value={form.dueDate}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />

          {/* Buttons */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-400 text-white px-3 py-1 rounded"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="bg-green-500 text-white px-3 py-1 rounded"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;
