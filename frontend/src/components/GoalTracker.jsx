import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import { format, isBefore, startOfDay } from "date-fns";
import { Trash2, Edit, Plus, Check, Clock, AlertCircle, User } from "lucide-react";
import 'react-circular-progressbar/dist/styles.css';

const GoalTracker = ({ role = 'mentee' }) => {
  const { user, token } = useAuth();
  const { socket, isConnected } = useSocket();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mentees, setMentees] = useState([]);
  const [selectedMentee, setSelectedMentee] = useState("");
  const [newGoal, setNewGoal] = useState({ 
    title: "", 
    description: "", 
    dueDate: "", 
    priority: "medium",
    milestones: [],
    menteeId: ""
  });
  const [newMilestone, setNewMilestone] = useState({ title: "", completed: false });
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const apiUrl = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    if (user && token) {
      fetchGoals();
      if (role === 'mentor') {
        fetchMentees();
      }
    }
  }, [user, token, role]);

  // Set up socket listeners for real-time updates
  useEffect(() => {
    if (socket && isConnected) {
      // Listen for goal updates
      socket.on('goalUpdated', handleGoalUpdate);
      
      // Listen for new goals
      socket.on('newGoal', handleNewGoal);
      
      // Listen for milestone updates
      socket.on('milestoneUpdate', handleMilestoneUpdate);
      
      // Listen for goal deletion
      socket.on('goalDeleted', handleGoalDeleted);
      
      return () => {
        socket.off('goalUpdated');
        socket.off('newGoal');
        socket.off('milestoneUpdate');
        socket.off('goalDeleted');
      };
    }
  }, [socket, isConnected]);

  const fetchMentees = async () => {
    if (!user || !token) {
      console.warn("Cannot fetch mentees: user not authenticated");
      return;
    }
    
    try {
      // Use the correct endpoint for fetching mentor's mentees
      const response = await axios.get(`${apiUrl}/api/connections/mentor/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Map connection data to mentee objects
      const menteeData = response.data.map((conn) => {
        // Check if mentee data is properly populated
        if (!conn.mentee || !conn.mentee._id) {
          console.warn("Found connection with missing mentee data:", conn);
          return null;
        }
        
        return {
          _id: conn.mentee._id,
          name: conn.mentee.name || "Unknown User",
          email: conn.mentee.email || "No email provided"
        };
      }).filter(mentee => mentee !== null);
      
      console.log("Fetched mentees for goal creation:", menteeData);
      setMentees(menteeData);
      
      // If no mentees found, show a message
      if (menteeData.length === 0) {
        toast.info("You don't have any connected mentees yet");
      }
    } catch (error) {
      console.error("Error fetching mentees:", error);
      toast.error("Failed to load mentees");
    }
  };

  const fetchGoals = async () => {
    if (!user || !token) return;
    
    setLoading(true);
    try {
      const endpoint = role === 'mentor' 
        ? `${apiUrl}/api/goals/mentor/${user._id}`
        : `${apiUrl}/api/goals/mentee/${user._id}`;
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGoals(response.data);
    } catch (error) {
      console.error("Error fetching goals:", error);
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  // Function to get mentee name by ID
  const getMenteeName = (menteeId) => {
    const mentee = mentees.find(m => m._id === menteeId);
    return mentee ? mentee.name : "Unknown Mentee";
  };

  const handleGoalUpdate = (data) => {
    console.log('Goal updated via socket:', data);
    if (data.goalId) {
      setGoals(prev => prev.map(goal => {
        if (goal._id === data.goalId) {
          return { ...goal, ...data.updates };
        }
        return goal;
      }));
      toast.success("Goal updated");
    }
  };

  const handleNewGoal = (goal) => {
    console.log('New goal received via socket:', goal);
    setGoals(prev => [goal, ...prev]);
    toast.success("New goal added");
  };

  const handleMilestoneUpdate = (data) => {
    console.log('Milestone update received via socket:', data);
    if (data.goalId && typeof data.milestoneIndex === 'number') {
      setGoals(prev => prev.map(goal => {
        if (goal._id === data.goalId && goal.milestones && goal.milestones[data.milestoneIndex]) {
          const updatedMilestones = [...goal.milestones];
          updatedMilestones[data.milestoneIndex] = {
            ...updatedMilestones[data.milestoneIndex],
            completed: data.completed,
            completedAt: data.completed ? new Date() : null
          };
          
          // Calculate new progress
          const completedCount = updatedMilestones.filter(m => m.completed).length;
          const progress = Math.round((completedCount / updatedMilestones.length) * 100);
          
          return { 
            ...goal, 
            milestones: updatedMilestones,
            progress
          };
        }
        return goal;
      }));
    }
  };

  const handleGoalDeleted = (goalId) => {
    console.log('Goal deleted via socket:', goalId);
    setGoals(prev => prev.filter(goal => goal._id !== goalId));
    toast.success("Goal removed");
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    
    // Validate that due date is not in the past
    const selectedDate = new Date(newGoal.dueDate);
    const today = startOfDay(new Date());
    
    if (isBefore(selectedDate, today)) {
      toast.error("Due date cannot be in the past");
      return;
    }
    
    try {
      const goalData = {
        ...newGoal,
        menteeId: role === 'mentee' ? user._id : selectedMentee,
        mentorId: role === 'mentor' ? user._id : null
      };
      
      const response = await axios.post(
        `${apiUrl}/api/goals`, 
        goalData, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setGoals([response.data, ...goals]);
      setNewGoal({ 
        title: "", 
        description: "", 
        dueDate: "", 
        priority: "medium",
        milestones: [],
        menteeId: ""
      });
      setSelectedMentee("");
      setShowAddForm(false);
      toast.success("Goal created successfully");
      
      // Emit socket event for real-time update
      if (socket && isConnected) {
        socket.emit('newGoalCreated', {
          goal: response.data,
          menteeId: response.data.menteeId,
          mentorId: response.data.mentorId
        });
      }
    } catch (error) {
      console.error("Error adding goal:", error);
      toast.error("Failed to create goal");
    }
  };

  const handleUpdateGoal = async (goalId, updates) => {
    // If updating due date, validate it's not in the past
    if (updates.dueDate) {
      const selectedDate = new Date(updates.dueDate);
      const today = startOfDay(new Date());
      
      if (isBefore(selectedDate, today)) {
        toast.error("Due date cannot be in the past");
        return;
      }
    }
    
    try {
      const response = await axios.put(
        `${apiUrl}/api/goals/${goalId}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setGoals(goals.map(goal => goal._id === goalId ? response.data : goal));
      toast.success("Goal updated successfully");
      
      // Emit socket event for real-time update
      if (socket && isConnected) {
        socket.emit('goalUpdate', {
          goalId,
          updates,
          menteeId: response.data.menteeId,
          mentorId: response.data.mentorId
        });
      }
    } catch (error) {
      console.error("Error updating goal:", error);
      toast.error("Failed to update goal");
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    
    try {
      const goalToDelete = goals.find(g => g._id === goalId);
      
      await axios.delete(
        `${apiUrl}/api/goals/${goalId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setGoals(goals.filter(goal => goal._id !== goalId));
      toast.success("Goal deleted successfully");
      
      // Emit socket event for real-time update
      if (socket && isConnected && goalToDelete) {
        socket.emit('goalDeleted', {
          goalId,
          menteeId: goalToDelete.menteeId,
          mentorId: goalToDelete.mentorId
        });
      }
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast.error("Failed to delete goal");
    }
  };

  const addMilestoneToGoal = async (goalId, milestone) => {
    try {
      const goal = goals.find(g => g._id === goalId);
      if (!goal) return;
      
      const updatedMilestones = [...goal.milestones, milestone];
      
      await handleUpdateGoal(goalId, { milestones: updatedMilestones });
      setNewMilestone({ title: "", completed: false });
      setShowMilestoneForm(false);
      setEditing(null);
    } catch (error) {
      console.error("Error adding milestone:", error);
      toast.error("Failed to add milestone");
    }
  };

  const toggleMilestoneStatus = async (goalId, milestoneIndex) => {
    try {
      const goal = goals.find(g => g._id === goalId);
      if (!goal) return;
      
      const updatedMilestones = [...goal.milestones];
      updatedMilestones[milestoneIndex] = {
        ...updatedMilestones[milestoneIndex],
        completed: !updatedMilestones[milestoneIndex].completed,
        completedAt: !updatedMilestones[milestoneIndex].completed ? new Date() : null
      };
      
      await handleUpdateGoal(goalId, { milestones: updatedMilestones });
      
      // Emit socket event for real-time update if milestone is completed
      if (socket && isConnected && updatedMilestones[milestoneIndex].completed) {
        socket.emit('milestoneCompleted', {
          goalId,
          milestoneIndex,
          menteeId: goal.menteeId,
          mentorId: goal.mentorId
        });
      }
    } catch (error) {
      console.error("Error toggling milestone status:", error);
      toast.error("Failed to update milestone");
    }
  };

  const calculateProgress = (goal) => {
    if (!goal.milestones || goal.milestones.length === 0) return 0;
    
    const completedCount = goal.milestones.filter(m => m.completed).length;
    return Math.round((completedCount / goal.milestones.length) * 100);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-amber-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch (e) {
      return "Invalid date";
    }
  };

  // Get today's date in YYYY-MM-DD format for the date input min attribute
  const getTodayFormatted = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Goals</h2>
        <Button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Goal
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Create New Goal</h3>
          <form onSubmit={handleAddGoal} className="space-y-4">
            {role === 'mentor' && (
              <div>
                <label className="block text-sm font-medium mb-1">Mentee</label>
                <select
                  value={selectedMentee}
                  onChange={(e) => setSelectedMentee(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select Mentee</option>
                  {mentees.map(mentee => (
                    <option key={mentee._id} value={mentee._id}>
                      {mentee.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={newGoal.title}
                onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                className="w-full p-2 border rounded"
                rows="3"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input
                  type="date"
                  value={newGoal.dueDate}
                  onChange={(e) => setNewGoal({...newGoal, dueDate: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                  min={getTodayFormatted()}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={newGoal.priority}
                  onChange={(e) => setNewGoal({...newGoal, priority: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create Goal
              </Button>
            </div>
          </form>
        </Card>
      )}

      {goals.length === 0 ? (
        <Card className="p-8 text-center">
          <h3 className="text-lg font-medium mb-2">No Goals Yet</h3>
          <p className="text-gray-500 mb-4">
            {role === 'mentee' 
              ? "Set your learning goals to track your progress" 
              : "Create goals for your mentees to track their progress"}
          </p>
          <Button 
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create First Goal
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(goal => (
            <Card key={goal._id} className="p-4 relative">
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <h3 className="font-semibold">{goal.title}</h3>
                  {role === 'mentor' && goal.menteeId && (
                    <div className="flex items-center text-sm text-blue-600 mb-1">
                      <User className="h-3.5 w-3.5 mr-1" />
                      <span>{getMenteeName(goal.menteeId)}</span>
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mt-1 line-clamp-3">{goal.description}</p>
                  <div className="flex items-center mt-2">
                    <span className={`text-xs font-medium ${getPriorityColor(goal.priority)}`}>
                      {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)} Priority
                    </span>
                    <span className="mx-2 text-gray-300">•</span>
                    <span className="text-xs text-gray-500">
                      Due: {formatDate(goal.dueDate)}
                    </span>
                  </div>
                </div>
                <div className="w-16 h-16 flex-shrink-0">
                  <CircularProgressbar
                    value={goal.progress || calculateProgress(goal)}
                    text={`${goal.progress || calculateProgress(goal)}%`}
                    styles={buildStyles({
                      textSize: '1.5rem',
                      pathColor: goal.progress < 30 ? '#EF4444' : goal.progress < 70 ? '#F59E0B' : '#10B981',
                      textColor: goal.progress < 30 ? '#EF4444' : goal.progress < 70 ? '#F59E0B' : '#10B981',
                    })}
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium">Milestones</h4>
                  <button
                    onClick={() => {
                      setEditing(goal._id);
                      setShowMilestoneForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Add Milestone
                  </button>
                </div>
                
                {showMilestoneForm && editing === goal._id && (
                  <div className="mb-3 p-3 bg-gray-50 rounded border">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMilestone.title}
                        onChange={(e) => setNewMilestone({...newMilestone, title: e.target.value})}
                        className="flex-1 p-2 text-sm border rounded"
                        placeholder="Enter milestone"
                      />
                      <Button
                        size="sm"
                        onClick={() => addMilestoneToGoal(goal._id, newMilestone)}
                        disabled={!newMilestone.title.trim()}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                )}
                
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                  {goal.milestones && goal.milestones.length > 0 ? (
                    goal.milestones.map((milestone, index) => (
                      <li key={index} className="flex items-center text-sm p-2 bg-gray-50 rounded">
                        <button
                          onClick={() => toggleMilestoneStatus(goal._id, index)}
                          className={`flex items-center justify-center w-5 h-5 rounded-full mr-2 ${
                            milestone.completed 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-200'
                          }`}
                        >
                          {milestone.completed && <Check className="w-3 h-3" />}
                        </button>
                        <span className={milestone.completed ? 'line-through text-gray-500' : ''}>
                          {milestone.title}
                        </span>
                        {milestone.completed && milestone.completedAt && (
                          <span className="ml-auto text-xs text-gray-400">
                            {formatDate(milestone.completedAt)}
                          </span>
                        )}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500 italic">No milestones added yet</li>
                  )}
                </ul>
              </div>
              
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => handleDeleteGoal(goal._id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default GoalTracker; 