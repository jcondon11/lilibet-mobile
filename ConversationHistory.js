// ConversationHistory.js - Complete File
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';

export const ConversationHistory = ({ onSelectConversation, onClose }) => {
  const { getConversations, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('all');

  const subjects = [
    { id: 'all', name: 'All Subjects', icon: 'apps', color: '#6b7280' },
    { id: 'math', name: 'Math', icon: 'calculator', color: '#3b82f6' },
    { id: 'reading', name: 'Reading', icon: 'book', color: '#10b981' },
    { id: 'writing', name: 'Writing', icon: 'create', color: '#8b5cf6' },
    { id: 'science', name: 'Science', icon: 'flask', color: '#ef4444' }
  ];

  useEffect(() => {
    loadConversations();
  }, [selectedSubject]);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const result = await getConversations(selectedSubject === 'all' ? null : selectedSubject);
      if (result.success) {
        setConversations(result.conversations);
      } else {
        console.error('Failed to load conversations:', result.error);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const getSubjectColor = (subject) => {
    const subjectObj = subjects.find(s => s.id === subject);
    return subjectObj ? subjectObj.color : '#6b7280';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#1f2937" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Your Learning History</Text>
            <Text style={styles.headerSubtitle}>
              Welcome back, {user?.displayName || 'Student'}!
            </Text>
          </View>
        </View>
      </View>

      {/* Subject Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.subjectFilter}
        contentContainerStyle={styles.subjectFilterContent}
      >
        {subjects.map((subject) => (
          <TouchableOpacity
            key={subject.id}
            style={[
              styles.subjectFilterButton,
              selectedSubject === subject.id && styles.subjectFilterSelected
            ]}
            onPress={() => setSelectedSubject(subject.id)}
          >
            <Ionicons 
              name={subject.icon} 
              size={16} 
              color={selectedSubject === subject.id ? 'white' : subject.color} 
            />
            <Text style={[
              styles.subjectFilterText,
              selectedSubject === subject.id && styles.subjectFilterTextSelected
            ]}>
              {subject.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Conversations List */}
      <ScrollView
        style={styles.conversationsList}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadConversations} />
        }
      >
        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Start a new conversation to see it here!
            </Text>
          </View>
        ) : (
          conversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.id}
              style={styles.conversationItem}
              onPress={() => onSelectConversation(conversation)}
            >
              <View style={styles.conversationHeader}>
                <View style={[
                  styles.subjectIndicator,
                  { backgroundColor: getSubjectColor(conversation.subject) }
                ]}>
                  <Ionicons 
                    name={subjects.find(s => s.id === conversation.subject)?.icon || 'book'} 
                    size={16} 
                    color="white" 
                  />
                </View>
                <View style={styles.conversationInfo}>
                  <Text style={styles.conversationTitle} numberOfLines={1}>
                    {conversation.title || `${conversation.subject} Session`}
                  </Text>
                  <View style={styles.conversationMeta}>
                    <Text style={styles.conversationDate}>
                      {formatDate(conversation.updated_at)}
                    </Text>
                    <Text style={styles.conversationLevel}>
                      {conversation.detected_level} level
                    </Text>
                    <Text style={styles.conversationModel}>
                      {conversation.model_used}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  subjectFilter: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  subjectFilterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  subjectFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  subjectFilterSelected: {
    backgroundColor: '#3b82f6',
  },
  subjectFilterText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  subjectFilterTextSelected: {
    color: 'white',
  },
  conversationsList: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  conversationItem: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  subjectIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  conversationMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  conversationDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  conversationLevel: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  conversationModel: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});