import React from 'react';

const Achievement = ({ achievements, userLevel }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Achievements</h2>
        <div className="bg-blue-100 text-blue-800 px-4 py-1 rounded-full">
          Level {userLevel}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {achievements.map(achievement => (
          <div
            key={achievement.id}
            className={`p-4 rounded-lg border-2 ${
              achievement.unlocked
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-gray-50 opacity-60'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{achievement.icon}</span>
              <div>
                <h3 className="font-semibold">{achievement.title}</h3>
                <p className="text-sm text-gray-600">{achievement.description}</p>
              </div>
            </div>
            {achievement.progress && (
              <div className="mt-3">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${achievement.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Progress: {achievement.progress}%
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Achievement; 