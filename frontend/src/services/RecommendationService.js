class RecommendationService {
  calculateCompatibilityScore(mentee, mentor) {
    let score = 0;
    
    // Skills match
    const skillMatch = mentor.skills.filter(skill => 
      mentee.skills.includes(skill)
    ).length;
    score += skillMatch * 10;

    // Experience level compatibility
    const expDiff = Math.abs(mentor.experienceYears - mentee.experienceYears);
    score += Math.max(0, 20 - expDiff * 2);

    // Interests alignment
    const interestMatch = mentor.interests.filter(interest =>
      mentee.interests.includes(interest)
    ).length;
    score += interestMatch * 5;

    // Availability match
    const availabilityMatch = mentor.availability.filter(slot =>
      mentee.availability.includes(slot)
    ).length;
    score += availabilityMatch * 8;

    return score;
  }

  async getRecommendedMentors(menteeId) {
    try {
      // Fetch mentee profile
      const menteeResponse = await fetch(`/api/users/${menteeId}`);
      const mentee = await menteeResponse.json();

      // Fetch available mentors
      const mentorsResponse = await fetch('/api/mentors/available');
      const mentors = await mentorsResponse.json();

      // Calculate compatibility scores
      const scoredMentors = mentors
        .map(mentor => ({
          ...mentor,
          compatibilityScore: this.calculateCompatibilityScore(mentee, mentor)
        }))
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

      // Return top 5 recommendations
      return scoredMentors.slice(0, 5);
    } catch (error) {
      console.error('Error getting mentor recommendations:', error);
      throw error;
    }
  }

  async updateMentorPreferences(menteeId, preferences) {
    try {
      const response = await fetch(`/api/users/${menteeId}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }
}

export default new RecommendationService(); 