import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const CreateTask = ({ menteeId, onTaskCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    attachments: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }

    if (!formData.dueDate) {
      errors.dueDate = 'Due date is required';
    } else {
      const dueDate = new Date(formData.dueDate);
      const now = new Date();
      if (dueDate < now) {
        errors.dueDate = 'Due date cannot be in the past';
      }
    }

    if (!formData.priority) {
      errors.priority = 'Priority is required';
    }

    // Validate file sizes
    if (formData.attachments.length > 5) {
      errors.attachments = 'Maximum 5 files allowed';
    }

    formData.attachments.forEach((file, index) => {
      if (file.size > 10 * 1024 * 1024) {
        errors[`attachment${index}`] = 'File size must be less than 10MB';
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('title', formData.title.trim());
      data.append('description', formData.description.trim());
      data.append('dueDate', formData.dueDate);
      data.append('priority', formData.priority);
      data.append('menteeId', menteeId);

      formData.attachments.forEach(file => {
        data.append('attachments', file);
      });

      const response = await axios.post(
        'http://localhost:5000/api/tasks',
        data,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Clear form
      setFormData({
        title: '',
        description: '',
        dueDate: '',
        priority: 'medium',
        attachments: []
      });

      // Notify parent component
      if (onTaskCreated) {
        onTaskCreated(response.data);
      }
    } catch (err) {
      console.error('Error creating task:', err);
      setError(err.response?.data?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      attachments: files
    }));
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.attachments;
      return newErrors;
    });
  };

  const getErrorMessage = (field) => {
    return validationErrors[field] || '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Task</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              validationErrors.title ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {validationErrors.title && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={4}
            className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              validationErrors.description ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {validationErrors.description && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
              Due Date
            </label>
            <input
              type="datetime-local"
              id="dueDate"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.dueDate ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {validationErrors.dueDate && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.dueDate}</p>
            )}
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
              Priority
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
              className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.priority ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            {validationErrors.priority && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.priority}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="attachments" className="block text-sm font-medium text-gray-700">
            Attachments
          </label>
          <input
            type="file"
            id="attachments"
            multiple
            onChange={handleFileChange}
            className={`mt-1 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              ${validationErrors.attachments ? 'border-red-300' : ''}`}
          />
          {validationErrors.attachments && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.attachments}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            You can upload up to 5 files (max 10MB each)
          </p>
          {formData.attachments.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium text-gray-700">Selected files:</p>
              <ul className="mt-1 space-y-1">
                {formData.attachments.map((file, index) => (
                  <li key={index} className="text-sm text-gray-600">
                    {file.name} ({Math.round(file.size / 1024 / 1024)}MB)
                    {validationErrors[`attachment${index}`] && (
                      <span className="text-red-600 ml-2">
                        {validationErrors[`attachment${index}`]}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className={`
              px-4 py-2 rounded-lg text-white
              ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}
              transition-colors flex items-center
              focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {loading && (
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default CreateTask; 