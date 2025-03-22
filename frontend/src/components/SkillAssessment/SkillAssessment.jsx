import React, { useState } from 'react';

const skillLevels = [
  { id: 1, name: 'Beginner' },
  { id: 2, name: 'Intermediate' },
  { id: 3, name: 'Advanced' },
  { id: 4, name: 'Expert' }
];

const SkillAssessment = ({ skills, onSave }) => {
  const [assessments, setAssessments] = useState({});

  const handleSkillLevel = (skillId, level) => {
    setAssessments(prev => ({
      ...prev,
      [skillId]: level
    }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Skill Assessment</h2>
      <div className="space-y-6">
        {skills.map(skill => (
          <div key={skill.id} className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-3">{skill.name}</h3>
            <div className="flex space-x-4">
              {skillLevels.map(level => (
                <button
                  key={level.id}
                  onClick={() => handleSkillLevel(skill.id, level.id)}
                  className={`px-4 py-2 rounded-full transition-all duration-200 ${
                    assessments[skill.id] === level.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {level.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => onSave(assessments)}
        className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-200"
      >
        Save Assessment
      </button>
    </div>
  );
};

export default SkillAssessment; 