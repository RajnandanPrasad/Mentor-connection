import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { 
  CheckIcon, 
  PlusIcon, 
  ArrowUpIcon, 
  StarIcon, 
  TrashIcon,
  PencilIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CalendarIcon,
  AcademicCapIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const GoalTracker = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('goals');
  
  // Goals state
  const [goals, setGoals] = useState([
    { 
      id: 1, 
      title: "Complete Full-Stack Web Development Course",
      description: "Finish all modules and final project",
      category: "learning",
      priority: "high",
      progress: 65, 
      dueDate: "2023-12-30",
      createdAt: "2023-10-01",
      todos: [
        { id: 1, text: "Complete HTML/CSS modules", completed: true },
        { id: 2, text: "Complete JavaScript modules", completed: true },
        { id: 3, text: "Complete React modules", completed: true },
        { id: 4, text: "Complete Node.js modules", completed: false },
        { id: 5, text: "Complete Final Project", completed: false }
      ]
    },
    { 
      id: 2, 
      title: "Build Personal Portfolio Website",
      description: "Design and develop a showcase website for my projects",
      category: "project",
      priority: "medium",
      progress: 40, 
      dueDate: "2024-01-15",
      createdAt: "2023-11-05",
      todos: [
        { id: 1, text: "Create wireframes", completed: true },
        { id: 2, text: "Design UI in Figma", completed: true },
        { id: 3, text: "Develop frontend", completed: false },
        { id: 4, text: "Add projects section", completed: false },
        { id: 5, text: "Deploy website", completed: false }
      ]
    },
    { 
      id: 3, 
      title: "Master Data Structures & Algorithms",
      description: "Complete 100 coding challenges and understand core algorithms",
      category: "learning",
      priority: "medium",
      progress: 20, 
      dueDate: "2024-02-28",
      createdAt: "2023-11-20",
      todos: [
        { id: 1, text: "Study arrays and strings", completed: true },
        { id: 2, text: "Study linked lists", completed: false },
        { id: 3, text: "Study trees and graphs", completed: false },
        { id: 4, text: "Study sorting algorithms", completed: false },
        { id: 5, text: "Complete 100 LeetCode challenges", completed: false }
      ]
    }
  ]);
  
  // Achievements state
  const [achievements, setAchievements] = useState([
    { 
      id: 1, 
      title: "Quick Starter", 
      description: "Completed first learning module in record time",
      date: "2023-10-15", 
      icon: "AcademicCapIcon", 
      badge: "bronze" 
    },
    { 
      id: 2, 
      title: "Commitment King", 
      description: "Maintained a 7-day streak of goal progress",
      date: "2023-11-01", 
      icon: "TrophyIcon", 
      badge: "silver" 
    },
    { 
      id: 3, 
      title: "Problem Solver", 
      description: "Completed 25+ coding challenges",
      date: "2023-11-22", 
      icon: "StarIcon", 
      badge: "gold" 
    }
  ]);
  
  // Reviews from mentor state
  const [reviews, setReviews] = useState([
    {
      id: 1,
      text: "Great progress on your React skills. Your components are well-structured and you're making good use of hooks.",
      rating: 4,
      date: "2023-11-10",
      mentorName: "Alex Johnson"
    },
    {
      id: 2,
      text: "Your portfolio design looks promising. Consider adding more interactive elements to showcase your JavaScript skills.",
      rating: 3,
      date: "2023-11-20",
      mentorName: "Alex Johnson"
    }
  ]);
  
  // New goal form state
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    category: "learning",
    priority: "medium",
    dueDate: "",
    todos: []
  });
  
  // New todo state for the selected goal
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [newTodo, setNewTodo] = useState("");

  // Handle adding a new goal
  const handleAddGoal = () => {
    if (!newGoal.title || !newGoal.dueDate) return;
    
    const goal = {
      id: Date.now(),
      title: newGoal.title,
      description: newGoal.description,
      category: newGoal.category,
      priority: newGoal.priority,
      progress: 0,
      dueDate: newGoal.dueDate,
      createdAt: new Date().toISOString().split('T')[0],
      todos: []
    };
    
    setGoals([...goals, goal]);
    setNewGoal({
      title: "",
      description: "",
      category: "learning",
      priority: "medium",
      dueDate: "",
      todos: []
    });
    setShowAddGoal(false);
  };
  
  // Handle updating goal progress
  const updateGoalProgress = (id, newProgress) => {
    setGoals(goals.map(goal => 
      goal.id === id ? { ...goal, progress: newProgress } : goal
    ));
  };
  
  // Calculate goal progress based on completed todos
  const calculateProgress = (goal) => {
    if (!goal.todos || goal.todos.length === 0) return goal.progress;
    
    const completedCount = goal.todos.filter(todo => todo.completed).length;
    return Math.round((completedCount / goal.todos.length) * 100);
  };
  
  // Handle adding a new todo to a goal
  const handleAddTodo = (goalId) => {
    if (!newTodo.trim()) return;
    
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        const updatedTodos = [
          ...goal.todos,
          { id: Date.now(), text: newTodo, completed: false }
        ];
        
        return { 
          ...goal, 
          todos: updatedTodos,
          progress: calculateProgress({ ...goal, todos: updatedTodos })
        };
      }
      return goal;
    });
    
    setGoals(updatedGoals);
    setNewTodo("");
  };
  
  // Handle toggling todo completion status
  const toggleTodoStatus = (goalId, todoId) => {
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        const updatedTodos = goal.todos.map(todo => 
          todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
        );
        
        return { 
          ...goal, 
          todos: updatedTodos,
          progress: calculateProgress({ ...goal, todos: updatedTodos })
        };
      }
      return goal;
    });
    
    setGoals(updatedGoals);
  };
  
  // Delete a todo
  const deleteTodo = (goalId, todoId) => {
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        const updatedTodos = goal.todos.filter(todo => todo.id !== todoId);
        
        return { 
          ...goal, 
          todos: updatedTodos,
          progress: calculateProgress({ ...goal, todos: updatedTodos })
        };
      }
      return goal;
    });
    
    setGoals(updatedGoals);
  };
  
  // Get color based on priority
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "text-red-600 bg-red-100";
      case "medium": return "text-yellow-600 bg-yellow-100";
      case "low": return "text-green-600 bg-green-100";
      default: return "text-blue-600 bg-blue-100";
    }
  };
  
  // Get color based on progress
  const getProgressColor = (progress) => {
    if (progress < 30) return "#EF4444"; // red
    if (progress < 70) return "#F59E0B"; // yellow
    return "#10B981"; // green
  };
  
  // Get badge color based on level
  const getBadgeColor = (badge) => {
    switch (badge) {
      case "bronze": return "bg-amber-700";
      case "silver": return "bg-gray-400";
      case "gold": return "bg-yellow-500";
      default: return "bg-blue-500";
    }
  };

  // Get icon component
  const getIconComponent = (iconName, className = "w-6 h-6") => {
    switch (iconName) {
      case "AcademicCapIcon": return <AcademicCapIcon className={className} />;
      case "TrophyIcon": return <TrophyIcon className={className} />;
      case "StarIcon": return <StarIcon className={className} />;
      default: return <StarIcon className={className} />;
    }
  };

    return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Goal Tracker</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate(-1)}
            variant="outline"
          >
            Back
          </Button>
          <Button 
            onClick={() => navigate("/mentee-dashboard")}
          >
            Dashboard
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full">
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="reviews">Mentor Reviews</TabsTrigger>
        </TabsList>
        
        <TabsContent value="goals" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">My Learning Goals</h2>
              <p className="text-gray-500">Track your progress and stay accountable</p>
            </div>
            <Button
              onClick={() => setShowAddGoal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <PlusIcon className="w-5 h-5 mr-1" /> New Goal
            </Button>
          </div>
          
          {/* Add new goal form */}
          {showAddGoal && (
            <Card className="p-6 bg-gray-50">
              <h3 className="text-lg font-medium mb-4">Create New Goal</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Title
                  </label>
                  <Input
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                    placeholder="What do you want to achieve?"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Textarea
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                    placeholder="Describe your goal in detail..."
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <Select
                      value={newGoal.category}
                      onValueChange={(value) => setNewGoal({...newGoal, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="learning">Learning</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="career">Career</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <Select
                      value={newGoal.priority}
                      onValueChange={(value) => setNewGoal({...newGoal, priority: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Date
                    </label>
                    <Input
                      type="date"
                      value={newGoal.dueDate}
                      onChange={(e) => setNewGoal({...newGoal, dueDate: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddGoal(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleAddGoal}
                  >
                    Create Goal
                  </Button>
                </div>
              </div>
            </Card>
          )}
          
          {/* Goals List */}
          <div className="space-y-4">
            {goals.map((goal) => (
              <Card key={goal.id} className="p-0 overflow-hidden">
                <div className="p-4 flex flex-col md:flex-row gap-4">
                  {/* Goal Info */}
                  <div className="flex-grow">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{goal.title}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(goal.priority)}`}>
                            {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1">{goal.description}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-500">
                          <span className="flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-1" />
                            Due: {format(new Date(goal.dueDate), "MMM dd, yyyy")}
                          </span>
                          <span className="flex items-center">
                            <AcademicCapIcon className="w-4 h-4 mr-1" />
                            Category: {goal.category.charAt(0).toUpperCase() + goal.category.slice(1)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Progress Circle */}
                      <div className="w-16 h-16 flex-shrink-0">
                        <CircularProgressbar
                          value={goal.progress}
                          text={`${goal.progress}%`}
                          styles={buildStyles({
                            textSize: '1.5rem',
                            pathColor: getProgressColor(goal.progress),
                            textColor: getProgressColor(goal.progress),
                          })}
                        />
                      </div>
                    </div>
                    
                    {/* Progress bar alternative */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="h-2.5 rounded-full" 
                          style={{ 
                            width: `${goal.progress}%`,
                            backgroundColor: getProgressColor(goal.progress)
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Todo List Section */}
                <div className="border-t border-gray-200 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Tasks</h4>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedGoal(selectedGoal === goal.id ? null : goal.id)}
                    >
                      {selectedGoal === goal.id ? (
                        <ChevronUpIcon className="w-5 h-5" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                  
                  {selectedGoal === goal.id && (
                    <div className="space-y-2">
                      {goal.todos.map((todo) => (
                        <div 
                          key={todo.id} 
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                        >
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleTodoStatus(goal.id, todo.id)}
                              className={`w-5 h-5 rounded mr-2 flex items-center justify-center ${
                                todo.completed ? 'bg-green-500 text-white' : 'border border-gray-300'
                              }`}
                            >
                              {todo.completed && <CheckIcon className="w-3 h-3" />}
                            </button>
                            <span className={todo.completed ? 'line-through text-gray-500' : ''}>
                              {todo.text}
                            </span>
                          </div>
                          <button 
                            onClick={() => deleteTodo(goal.id, todo.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      
                      {/* Add new todo form */}
                      <div className="flex items-center mt-2">
                        <Input
                          value={newTodo}
                          onChange={(e) => setNewTodo(e.target.value)}
                          placeholder="Add a new task..."
                          className="flex-grow"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddTodo(goal.id)}
                        />
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleAddTodo(goal.id)}
                        >
                          <PlusIcon className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="achievements" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">My Achievements</h2>
              <p className="text-gray-500">Milestones and recognitions in your learning journey</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {achievements.map((achievement) => (
              <Card key={achievement.id} className="p-4 flex items-start space-x-4">
                <div className={`p-3 rounded-full ${getBadgeColor(achievement.badge)} text-white`}>
                  {getIconComponent(achievement.icon)}
                </div>
                <div>
                  <h3 className="font-semibold">{achievement.title}</h3>
                  <p className="text-sm text-gray-600">{achievement.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Earned on {format(new Date(achievement.date), "MMMM dd, yyyy")}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="reviews" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Mentor Reviews</h2>
              <p className="text-gray-500">Feedback from your mentor on your progress</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-800">{review.text}</p>
                    <div className="mt-2 flex items-center">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <StarIcon 
                            key={i} 
                            className={`w-4 h-4 ${
                              i < review.rating 
                                ? 'text-yellow-500 fill-yellow-500' 
                                : 'text-gray-300'
                            }`} 
                          />
                        ))}
                      </div>
                      <span className="ml-2 text-sm text-gray-600">
                        by {review.mentorName}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {format(new Date(review.date), "MMM dd, yyyy")}
                  </span>
                </div>
              </Card>
            ))}
            
            {reviews.length === 0 && (
              <div className="text-center py-10 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No reviews yet from your mentor.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      </div>
    );
};
  
  export default GoalTracker;
  