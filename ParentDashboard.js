import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');

const API_URL = 'https://lilibet-backend-production.up.railway.app';

export default function ParentDashboard({ onBack }) {
  const { user, token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedChild, setSelectedChild] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Simulated analytics data - replace with actual API call
      const mockAnalytics = {
        totalSessions: 42,
        totalMinutes: 385,
        averageSessionLength: 9.2,
        streak: 7,
        points: 1250,
        subjects: {
          Math: { sessions: 15, minutes: 120, improvement: 15 },
          Science: { sessions: 10, minutes: 95, improvement: 22 },
          Reading: { sessions: 8, minutes: 85, improvement: 18 },
          Writing: { sessions: 5, minutes: 45, improvement: 12 },
          General: { sessions: 4, minutes: 40, improvement: 8 }
        },
        learningModes: {
          discovery: { count: 45, percentage: 30 },
          practice: { count: 38, percentage: 25 },
          explanation: { count: 30, percentage: 20 },
          challenge: { count: 23, percentage: 15 },
          review: { count: 15, percentage: 10 }
        },
        weeklyProgress: [
          { day: 'Mon', minutes: 45 },
          { day: 'Tue', minutes: 52 },
          { day: 'Wed', minutes: 38 },
          { day: 'Thu', minutes: 61 },
          { day: 'Fri', minutes: 55 },
          { day: 'Sat', minutes: 72 },
          { day: 'Sun', minutes: 62 }
        ],
        achievements: [
          { id: 1, title: 'Week Warrior', description: '7-day streak!', icon: '🔥', date: '2024-01-20' },
          { id: 2, title: 'Math Master', description: '10 math sessions completed', icon: '🔢', date: '2024-01-19' },
          { id: 3, title: 'Curious Mind', description: '50 discovery questions asked', icon: '🔍', date: '2024-01-18' }
        ],
        recommendations: [
          'Consider adding more Writing practice sessions',
          'Great progress in Science! Keep it up!',
          'Try some Challenge mode in Math to test knowledge'
        ]
      };

      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <LinearGradient
      colors={[color, color + '99']}
      style={styles.statCard}
    >
      <View style={styles.statCardIcon}>
        {icon}
      </View>
      <Text style={styles.statCardValue}>{value}</Text>
      <Text style={styles.statCardTitle}>{title}</Text>
      {subtitle && <Text style={styles.statCardSubtitle}>{subtitle}</Text>}
    </LinearGradient>
  );

  const ProgressBar = ({ label, value, maxValue, color }) => {
    const percentage = (value / maxValue) * 100;
    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarHeader}>
          <Text style={styles.progressBarLabel}>{label}</Text>
          <Text style={styles.progressBarValue}>{value}</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <LinearGradient
            colors={[color, color + 'CC']}
            style={[styles.progressBarFill, { width: `${percentage}%` }]}
          />
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667EEA', '#764BA2']}
        style={styles.header}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parent Dashboard</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {['day', 'week', 'month'].map(period => (
            <TouchableOpacity
              key={period}
              onPress={() => setSelectedPeriod(period)}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive
              ]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Key Stats */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.statsRow}
        >
          <StatCard
            title="Total Sessions"
            value={analytics.totalSessions}
            subtitle="this week"
            icon={<FontAwesome5 name="book-reader" size={24} color="white" />}
            color="#FF6B6B"
          />
          <StatCard
            title="Learning Time"
            value={`${Math.floor(analytics.totalMinutes / 60)}h ${analytics.totalMinutes % 60}m`}
            subtitle="total"
            icon={<Ionicons name="time" size={24} color="white" />}
            color="#4ECDC4"
          />
          <StatCard
            title="Current Streak"
            value={`${analytics.streak} days`}
            subtitle="keep going!"
            icon={<FontAwesome5 name="fire" size={24} color="white" />}
            color="#FFD93D"
          />
          <StatCard
            title="Points Earned"
            value={analytics.points}
            subtitle="great job!"
            icon={<FontAwesome5 name="star" size={24} color="white" />}
            color="#A8E6CF"
          />
        </ScrollView>

        {/* Subject Progress */}
        <Text style={styles.sectionTitle}>Subject Progress</Text>
        <View style={styles.card}>
          {Object.entries(analytics.subjects).map(([subject, data]) => (
            <View key={subject} style={styles.subjectRow}>
              <View style={styles.subjectInfo}>
                <Text style={styles.subjectName}>{subject}</Text>
                <Text style={styles.subjectStats}>
                  {data.sessions} sessions • {data.minutes} min
                </Text>
              </View>
              <View style={styles.improvementBadge}>
                <Ionicons 
                  name={data.improvement > 0 ? "trending-up" : "trending-down"} 
                  size={16} 
                  color={data.improvement > 0 ? "#4CAF50" : "#FF5252"} 
                />
                <Text style={[
                  styles.improvementText,
                  { color: data.improvement > 0 ? "#4CAF50" : "#FF5252" }
                ]}>
                  {data.improvement}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Learning Modes Distribution */}
        <Text style={styles.sectionTitle}>Learning Modes Used</Text>
        <View style={styles.card}>
          {Object.entries(analytics.learningModes).map(([mode, data]) => (
            <ProgressBar
              key={mode}
              label={mode.charAt(0).toUpperCase() + mode.slice(1)}
              value={data.percentage}
              maxValue={100}
              color="#6C63FF"
            />
          ))}
        </View>

        {/* Weekly Activity */}
        <Text style={styles.sectionTitle}>Weekly Activity</Text>
        <View style={styles.card}>
          <View style={styles.weeklyChart}>
            {analytics.weeklyProgress.map((day, index) => (
              <View key={index} style={styles.dayColumn}>
                <View style={styles.dayBar}>
                  <View 
                    style={[
                      styles.dayBarFill,
                      { height: `${(day.minutes / 80) * 100}%` }
                    ]}
                  />
                </View>
                <Text style={styles.dayLabel}>{day.day}</Text>
                <Text style={styles.dayMinutes}>{day.minutes}m</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Achievements */}
        <Text style={styles.sectionTitle}>Recent Achievements</Text>
        <View style={styles.card}>
          {analytics.achievements.map(achievement => (
            <View key={achievement.id} style={styles.achievementRow}>
              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <Text style={styles.achievementDescription}>
                  {achievement.description}
                </Text>
              </View>
              <Text style={styles.achievementDate}>
                {new Date(achievement.date).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>

        {/* Recommendations */}
        <Text style={styles.sectionTitle}>Recommendations</Text>
        <View style={styles.card}>
          {analytics.recommendations.map((rec, index) => (
            <View key={index} style={styles.recommendationRow}>
              <Ionicons name="bulb" size={20} color="#FFD93D" />
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#6C63FF',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSpacer: {
    width: 34,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 5,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  periodButtonActive: {
    backgroundColor: '#6C63FF',
  },
  periodButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  statsRow: {
    marginBottom: 20,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  statCard: {
    width: 140,
    padding: 15,
    borderRadius: 20,
    marginRight: 12,
    alignItems: 'center',
  },
  statCardIcon: {
    marginBottom: 10,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  statCardTitle: {
    fontSize: 12,
    color: 'white',
    opacity: 0.9,
  },
  statCardSubtitle: {
    fontSize: 10,
    color: 'white',
    opacity: 0.7,
    marginTop: 2,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  subjectStats: {
    fontSize: 12,
    color: '#666',
  },
  improvementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  improvementText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  progressBarContainer: {
    marginBottom: 15,
  },
  progressBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressBarLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  progressBarValue: {
    fontSize: 14,
    color: '#6C63FF',
    fontWeight: 'bold',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  weeklyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 150,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  dayBar: {
    flex: 1,
    width: 30,
    backgroundColor: '#F0F0F0',
    borderRadius: 15,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  dayBarFill: {
    backgroundColor: '#6C63FF',
    borderRadius: 15,
    minHeight: 10,
  },
  dayLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  dayMinutes: {
    fontSize: 10,
    color: '#6C63FF',
    fontWeight: 'bold',
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  achievementIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 12,
    color: '#666',
  },
  achievementDate: {
    fontSize: 10,
    color: '#999',
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    lineHeight: 20,
  },
});