import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

const GoalTracker = ({ menteeId, mentorId }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    deadline: '',
    milestones: []
  });
  const [newMilestone, setNewMilestone] = useState('');

  // Fetch goals
  const fetchGoals = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/goals/${menteeId}/${mentorId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setGoals(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching goals:', err);
      setError('Failed to fetch goals. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [menteeId, mentorId]);

  // Add new goal
  const handleAddGoal = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/goals/${menteeId}/${mentorId}`,
        newGoal,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setGoals([...goals, response.data]);
      setIsAddingGoal(false);
      setNewGoal({
        title: '',
        description: '',
        deadline: '',
        milestones: []
      });
    } catch (err) {
      console.error('Error adding goal:', err);
      setError('Failed to add goal. Please try again.');
    }
  };

  // Add milestone to goal
  const handleAddMilestone = async (goalId) => {
    if (!newMilestone.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/goals/${goalId}/milestones`,
        { description: newMilestone },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setGoals(goals.map(goal => 
        goal._id === goalId 
          ? { ...goal, milestones: [...goal.milestones, response.data] }
          : goal
      ));
      setNewMilestone('');
    } catch (err) {
      console.error('Error adding milestone:', err);
      setError('Failed to add milestone. Please try again.');
    }
  };

  // Update milestone status
  const handleUpdateMilestoneStatus = async (goalId, milestoneId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `http://localhost:5000/api/goals/${goalId}/milestones/${milestoneId}`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setGoals(goals.map(goal => 
        goal._id === goalId 
          ? {
              ...goal,
              milestones: goal.milestones.map(milestone =>
                milestone._id === milestoneId
                  ? { ...milestone, status }
                  : milestone
              )
            }
          : goal
      ));
    } catch (err) {
      console.error('Error updating milestone:', err);
      setError('Failed to update milestone. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Goal Tracker</h2>
        <button
          onClick={() => setIsAddingGoal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Add New Goal
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Add Goal Form */}
      {isAddingGoal && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-md"
        >
          <h3 className="text-lg font-semibold mb-4">Add New Goal</h3>
          <form onSubmit={handleAddGoal} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows="3"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Deadline</label>
              <input
                type="date"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsAddingGoal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md"
              >
                Add Goal
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Goals List */}
      <div className="space-y-4">
        {goals.map(goal => (
          <motion.div
            key={goal._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow-md"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                <p className="text-gray-600 mt-1">{goal.description}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Deadline: {new Date(goal.deadline).toLocaleDateString()}
                </p>
              </div>
              <div className="text-sm text-gray-500">
                Progress: {Math.round((goal.milestones.filter(m => m.status === 'completed').length / goal.milestones.length) * 100)}%
              </div>
            </div>

            {/* Milestones */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Milestones</h4>
              {goal.milestones.map(milestone => (
                <div
                  key={milestone._id}
                  className="flex items-center space-x-3 p-2 bg-gray-50 rounded-md"
                >
                  <input
                    type="checkbox"
                    checked={milestone.status === 'completed'}
                    onChange={() => handleUpdateMilestoneStatus(
                      goal._id,
                      milestone._id,
                      milestone.status === 'completed' ? 'pending' : 'completed'
                    )}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className={`text-sm ${milestone.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                    {milestone.description}
                  </span>
                </div>
              ))}

              {/* Add Milestone */}
              <div className="flex space-x-2 mt-2">
                <input
                  type="text"
                  value={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.value)}
                  placeholder="Add a new milestone..."
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleAddMilestone(goal._id)}
                  className="px-3 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md"
                >
                  Add
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {goals.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No goals set yet. Add your first goal to get started!
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalTracker; 