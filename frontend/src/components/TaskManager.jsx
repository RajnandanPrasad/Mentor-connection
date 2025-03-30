import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Target, Link } from 'lucide-react';

const TaskManager = ({ role = 'mentor' }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [mentees, setMentees] = useState([]);
  const [selectedMentee, setSelectedMentee] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [goals, setGoals] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    menteeId: '',
    goalId: ''
  });

  // Track if each task is being edited
  const [editingTask, setEditingTask] = useState(null);
  const [editedTask, setEditedTask] = useState({});

  useEffect(() => {
    if (role === 'mentor') {
    fetchMentees();
    } else {
      // For mentee role, fetch tasks directly
      fetchTasks();
    }
  }, [role]);

  useEffect(() => {
    if (role === 'mentor' && selectedMentee) {
      fetchTasks();
    }
  }, [selectedMentee, role]);

  useEffect(() => {
    applyFilters();
  }, [tasks, statusFilter]);

  useEffect(() => {
    if ((role === 'mentor' && selectedMentee) || role === 'mentee') {
      fetchGoals();
    }
  }, [selectedMentee, role]);

  const applyFilters = () => {
    let filtered = [...tasks];
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }
    
    // Sort by priority and due date
    filtered.sort((a, b) => {
      // First sort by status (incomplete tasks first)
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      
      // Then sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      
      // Then sort by due date
      const dateA = parseISO(a.dueDate);
      const dateB = parseISO(b.dueDate);
      return dateA - dateB;
    });
    
    setFilteredTasks(filtered);
  };

  const fetchMentees = async () => {
    try {
      setError(null);
      const response = await api.get(`/api/connections/mentor/${user._id}`);
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid mentee data received');
      }
      
      const menteesList = response.data
        .filter(connection => connection.mentee && connection.mentee._id)
        .map(connection => ({
        _id: connection.mentee._id,
        name: connection.mentee.name,
        email: connection.mentee.email
      }));
        
      setMentees(menteesList);
      
      // Auto-select first mentee if available
      if (menteesList.length > 0 && !selectedMentee) {
        setSelectedMentee(menteesList[0]._id);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching mentees:', error);
      setError('Failed to fetch mentees: ' + (error.message || 'Unknown error'));
      toast.error('Failed to fetch mentees');
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url;
      if (role === 'mentor') {
        url = `/api/tasks/mentor/${user._id}/mentee/${selectedMentee}`;
      } else {
        url = `/api/tasks/mentee/${user._id}`;
      }
      
      const response = await api.get(url);
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid task data received');
      }
      
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Failed to fetch tasks: ' + (error.message || 'Unknown error'));
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchGoals = async () => {
    try {
      let url;
      if (role === 'mentor' && selectedMentee) {
        url = `/api/goals/mentee/${selectedMentee}`;
      } else if (role === 'mentee') {
        url = `/api/goals/mentee/${user._id}`;
      } else {
        return;
      }

      const response = await api.get(url);
      if (response.data && Array.isArray(response.data)) {
        setGoals(response.data);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Failed to fetch goals');
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    
    if (!newTask.title.trim() || !newTask.dueDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      const taskData = {
        ...newTask,
        mentorId: user._id,
        menteeId: role === 'mentor' ? selectedMentee : user._id
      };
      
      const response = await api.post('/api/tasks', taskData);
      
      setTasks([...tasks, response.data]);
      setShowAddTask(false);
      setNewTask({
        title: '',
        description: '',
        dueDate: '',
        priority: 'medium',
        goalId: ''
      });
      toast.success('Task added successfully');
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task: ' + (error.message || 'Unknown error'));
    }
  };

  const handleUpdateTaskStatus = async (taskId, status) => {
    try {
      await api.patch(`/api/tasks/${taskId}`, { status });
      
      setTasks(tasks.map(task => 
        task._id === taskId ? { ...task, status } : task
      ));
      
      toast.success('Task status updated');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task status');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`/api/tasks/${taskId}`);
      setTasks(tasks.filter(task => task._id !== taskId));
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task._id);
    setEditedTask({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate.substring(0, 10), // Format date for input field
      priority: task.priority,
      goalId: task.goalId || ''
    });
  };

  const handleUpdateTask = async (taskId) => {
    try {
      const response = await api.put(`/api/tasks/${taskId}`, editedTask);
      
      setTasks(tasks.map(task => 
        task._id === taskId ? { ...task, ...response.data } : task
      ));
      
      setEditingTask(null);
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task: ' + (error.message || 'Unknown error'));
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDueDateColor = (dueDate) => {
    try {
      const today = new Date();
      const due = parseISO(dueDate);
      
      if (isBefore(due, today)) {
        return 'text-red-600 font-semibold';
      } else if (isAfter(due, new Date(today.setDate(today.getDate() + 3)))) {
        return 'text-green-600';
      } else {
        return 'text-yellow-600';
      }
    } catch (e) {
      return '';
    }
  };

  const getGoalTitleById = (goalId) => {
    const goal = goals.find(g => g._id === goalId);
    return goal ? goal.title : 'No goal linked';
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <div className="text-center text-red-600 p-4 bg-red-50 rounded-lg">
        <p className="mb-4">{error}</p>
        <Button onClick={fetchTasks} className="bg-blue-500 hover:bg-blue-600">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Task Management</h2>
        <div className="flex gap-4 items-center">
          {role === 'mentor' && (
          <Select value={selectedMentee} onValueChange={setSelectedMentee}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a mentee" />
            </SelectTrigger>
            <SelectContent>
              {mentees.map((mentee) => (
                <SelectItem key={mentee._id} value={mentee._id}>
                  {mentee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          )}
          
          {(role === 'mentor' || role === 'mentee') && (
          <Button 
            onClick={() => setShowAddTask(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
              {role === 'mentor' ? 'Assign New Task' : 'Add New Task'}
          </Button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <Tabs defaultValue="all" value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {showAddTask && (
        <Card className="p-6">
          <form onSubmit={handleAddTask} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Title <span className="text-red-600">*</span>
              </label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Enter task title"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-600">*</span>
              </label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Enter task description"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date <span className="text-red-600">*</span>
                </label>
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <Select
                  value={newTask.priority}
                  onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link to Goal
              </label>
              <Select
                value={newTask.goalId}
                onValueChange={(value) => setNewTask({ ...newTask, goalId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a goal (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No goal (independent task)</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal._id} value={goal._id}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddTask(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white">
                {role === 'mentor' ? 'Assign Task' : 'Add Task'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {(role === 'mentor' && !selectedMentee && mentees.length > 0) ? (
        <div className="text-center p-6">
          <p>Please select a mentee to view their tasks</p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${filteredTasks.length > 0 ? 'md:grid-cols-2 lg:grid-cols-3' : ''} gap-4`}>
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <Card key={task._id} className={`p-4 border-l-4 ${
                task.status === 'completed' ? 'border-l-green-500' :
                task.priority === 'high' ? 'border-l-red-500' :
                task.priority === 'medium' ? 'border-l-yellow-500' :
                'border-l-blue-500'
              }`}>
                {editingTask === task._id ? (
                  // Edit mode
                  <div className="space-y-3">
                    <Input
                      value={editedTask.title}
                      onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                      placeholder="Task title"
                      className="font-semibold"
                    />
                    <Textarea
                      value={editedTask.description}
                      onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                      placeholder="Description"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={editedTask.dueDate}
                        onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
                      />
                      <Select
                        value={editedTask.priority}
                        onValueChange={(value) => setEditedTask({ ...editedTask, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Select
                      value={editedTask.goalId || ''}
                      onValueChange={(value) => setEditedTask({ ...editedTask, goalId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a goal (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No goal (independent task)</SelectItem>
                        {goals.map((goal) => (
                          <SelectItem key={goal._id} value={goal._id}>
                            {goal.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end gap-2 mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingTask(null)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleUpdateTask(task._id)}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div>
                    <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-gray-800">{task.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                    </div>
                    
                    <div className="mt-3 text-sm">
                      <div className={`${getDueDateColor(task.dueDate)}`}>
                    Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                  </div>
                      
                      {task.goalId && (
                        <div className="flex items-center text-blue-600 text-xs mt-1">
                          <Link className="h-3 w-3 mr-1" />
                          <span>Goal: {getGoalTitleById(task.goalId)}</span>
                </div>
                      )}
                      
                      <div className="flex justify-between items-center mt-3">
                <Select
                  value={task.status}
                  onValueChange={(value) => handleUpdateTaskStatus(task._id, value)}
                >
                          <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => handleEditTask(task)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </Button>
                          
                <Button
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 text-red-600 hover:bg-red-50" 
                  onClick={() => handleDeleteTask(task._id)}
                >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                </Button>
              </div>
                      </div>
                    </div>
                  </div>
                )}
            </Card>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-600 mb-4">No tasks found</p>
              <Button 
                onClick={() => setShowAddTask(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {role === 'mentor' ? 'Assign a Task' : 'Create a Task'}
              </Button>
        </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskManager; 