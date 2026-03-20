import { useEffect, useState } from "react";
import { loadTasks, removeTask, updateTask } from "../lib/api";

const TaskList = ({ refreshKey, showToast }) => {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("dueDateAsc");
  const [editingTask, setEditingTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    completed: false,
  });

  const tasksPerPage = 5;

  const fetchTasks = () =>
    loadTasks()
      .then((result) => {
        setTasks(result.tasks);
        setError(result.source === "local" ? "" : result.error || "");
        setCurrentPage(1);
      })
      .catch((err) => {
        setTasks([]);
        setCurrentPage(1);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Tasks load nahi ho pa rahe. Backend ya database connection check karo."
        );
      });

  useEffect(() => {
    fetchTasks();
  }, [refreshKey]);

  const deleteTask = async (id) => {
    try {
      await removeTask(id);
      showToast?.("Task successfully delete ho gaya.");
      fetchTasks();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Task delete nahi hua. Dobara try karo.";
      setError(message);
      showToast?.(message, "error");
    }
  };

  const toggleComplete = async (task) => {
    try {
      await updateTask(task._id, {
        completed: !task.completed,
      });
      showToast?.(
        task.completed
          ? "Task pending me move ho gaya."
          : "Task completed mark ho gaya."
      );
      fetchTasks();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Task status update nahi hua. Dobara try karo.";
      setError(message);
      showToast?.(message, "error");
    }
  };

  const startEditing = (task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title || "",
      description: task.description || "",
      dueDate: task.dueDate?.slice(0, 10) || "",
      completed: Boolean(task.completed),
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      await updateTask(editingTask._id, editForm);
      setEditingTask(null);
      showToast?.("Task successfully update ho gaya.");
      fetchTasks();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Task update nahi hua. Dobara try karo.";
      setError(message);
      showToast?.(message, "error");
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredTasks = tasks
    .filter((task) => {
      if (statusFilter === "completed" && !task.completed) {
        return false;
      }

      if (statusFilter === "pending" && task.completed) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [task.title, task.description, task.dueDate?.slice(0, 10)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    })
    .sort((firstTask, secondTask) => {
      if (sortBy === "titleAsc") {
        return firstTask.title.localeCompare(secondTask.title);
      }

      if (sortBy === "titleDesc") {
        return secondTask.title.localeCompare(firstTask.title);
      }

      if (sortBy === "status") {
        return Number(firstTask.completed) - Number(secondTask.completed);
      }

      const firstDueDate = firstTask.dueDate
        ? new Date(firstTask.dueDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      const secondDueDate = secondTask.dueDate
        ? new Date(secondTask.dueDate).getTime()
        : Number.MAX_SAFE_INTEGER;

      return sortBy === "dueDateDesc"
        ? secondDueDate - firstDueDate
        : firstDueDate - secondDueDate;
    });

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / tasksPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * tasksPerPage;
  const currentTasks = filteredTasks.slice(startIndex, startIndex + tasksPerPage);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h2 className="mb-4 text-2xl font-bold">Task List</h2>

      {error && (
        <p className="mb-4 rounded-md bg-red-100 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mb-4 grid gap-3 rounded-lg bg-white p-4 shadow-sm md:grid-cols-3">
        <input
          type="text"
          placeholder="Search by title, description, due date"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="dueDateAsc">Due Date: Oldest First</option>
          <option value="dueDateDesc">Due Date: Newest First</option>
          <option value="titleAsc">Title: A to Z</option>
          <option value="titleDesc">Title: Z to A</option>
          <option value="status">Status: Pending First</option>
        </select>
      </div>

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
            {currentTasks.length === 0 ? (
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
                      className={`rounded-full px-3 py-1 text-sm font-semibold text-white ${
                        task.completed ? "bg-green-500" : "bg-amber-500"
                      }`}
                    >
                      {task.completed ? "Done" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleComplete(task)}
                        className={`rounded-full px-3 py-1 text-sm font-medium text-white ${
                          task.completed
                            ? "bg-slate-500 hover:bg-slate-600"
                            : "bg-blue-500 hover:bg-blue-600"
                        }`}
                      >
                        {task.completed ? "Mark Pending" : "Mark Done"}
                      </button>

                      <button
                        type="button"
                        onClick={() => startEditing(task)}
                        className="rounded-full bg-amber-500 px-3 py-1 text-sm font-medium text-white hover:bg-amber-600"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => setTaskToDelete(task)}
                        className="rounded-full bg-red-500 px-3 py-1 text-sm font-medium text-white hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
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
            {Math.min(startIndex + currentTasks.length, filteredTasks.length)} of{" "}
            {filteredTasks.length} tasks
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={safeCurrentPage === 1}
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
                    safeCurrentPage === page
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
              disabled={safeCurrentPage === totalPages}
              className="rounded border border-gray-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold">Edit Task</h3>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="rounded-full px-3 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <input
                type="text"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Title"
                required
                className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />

              <textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Description"
                rows="4"
                className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />

              <input
                type="date"
                value={editForm.dueDate}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, dueDate: e.target.value }))
                }
                className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />

              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={editForm.completed}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      completed: e.target.checked,
                    }))
                  }
                />
                Mark as completed
              </label>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="rounded bg-gray-400 px-4 py-2 text-white hover:bg-gray-500"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded bg-amber-500 px-4 py-2 text-white hover:bg-amber-600"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900">Delete Task</h3>
            <p className="mt-3 text-sm text-gray-600">
              "{taskToDelete.title}" ko delete karna hai? Ye action undo nahi hoga.
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  await deleteTask(taskToDelete._id);
                  setTaskToDelete(null);
                }}
                className="rounded bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;
