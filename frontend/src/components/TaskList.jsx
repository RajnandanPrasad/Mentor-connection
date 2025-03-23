import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { user } = useAuth();

  useEffect(() => {
    fetchTasks();
  }, [user?.role, page]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const endpoint = user?.role === 'mentor' ? '/mentor' : '/mentee';
      const response = await axios.get(`http://localhost:5000/api/tasks${endpoint}`, {
        params: { page, limit: 10 },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTasks(response.data.tasks);
      setTotalPages(response.data.pagination.pages);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.response?.data?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      const response = await axios.put(
        `http://localhost:5000/api/tasks/${taskId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setTasks(tasks.map(task => 
        task._id === taskId ? response.data : task
      ));
      setError(null);
    } catch (err) {
      console.error('Error updating task status:', err);
      setError(err.response?.data?.message || 'Failed to update task status');
    }
  };

  const handleFeedback = async (taskId, feedback) => {
    try {
      const response = await axios.put(
        `http://localhost:5000/api/tasks/${taskId}/feedback`,
        feedback,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setTasks(tasks.map(task => 
        task._id === taskId ? response.data : task
      ));
      setError(null);
    } catch (err) {
      console.error('Error providing feedback:', err);
      setError(err.response?.data?.message || 'Failed to provide feedback');
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
    
    try {
      await axios.delete(
        `http://localhost:5000/api/tasks/${taskId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setTasks(tasks.filter(task => task._id !== taskId));
      setError(null);
    } catch (err) {
      console.error('Error deleting task:', err);
      setError(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.pending;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.medium;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchTasks}
          className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tasks.map((task) => (
        <motion.div
          key={task._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">{task.title}</h3>
              <p className="text-gray-600">{task.description}</p>
              
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                  {task.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  {task.priority.toUpperCase()}
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Due: {new Date(task.dueDate).toLocaleDateString()}
                </span>
              </div>

              {task.attachments?.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700">Attachments:</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {task.attachments.map((file, index) => (
                      <a
                        key={index}
                        href={`http://localhost:5000${file.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        {file.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {task.submissionLink && (
                <div className="mt-2">
                  <span className="text-sm font-medium text-gray-700">Submission:</span>
                  <a
                    href={task.submissionLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    View Submission
                  </a>
                </div>
              )}

              {task.feedback && (
                <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700">Feedback:</h4>
                  <p className="text-gray-600 mt-1">{task.feedback.comment}</p>
                  {task.feedback.rating && (
                    <div className="flex items-center mt-2">
                      <span className="text-sm text-gray-600">Rating:</span>
                      <div className="ml-2 flex">
                        {[...Array(task.feedback.rating)].map((_, i) => (
                          <svg
                            key={i}
                            className="w-4 h-4 text-yellow-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              {user?.role === 'mentee' && task.status !== 'completed' && (
                <select
                  value={task.status}
                  onChange={(e) => handleStatusUpdate(task._id, e.target.value)}
                  className="px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              )}

              {user?.role === 'mentor' && (
                <>
                  <button
                    onClick={() => {
                      const feedback = {
                        comment: prompt('Enter feedback comment:'),
                        rating: parseInt(prompt('Enter rating (1-5):'))
                      };
                      if (feedback.comment && feedback.rating) {
                        handleFeedback(task._id, feedback);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Provide Feedback
                  </button>
                  <button
                    onClick={() => handleDelete(task._id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Delete Task
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      ))}

      {tasks.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No tasks found.
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center space-x-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskList; 