import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayer } from '../context/PlayerContext';

const { height } = Dimensions.get('window');

const TIMER_OPTIONS = [
  { label: 'End of track', minutes: -1 },
  { label: '5 min', minutes: 5 },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
  { label: '90 min', minutes: 90 },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const SleepTimerSheet: React.FC<Props> = ({ visible, onClose }) => {
  const { sleepMinutes, sleepRemainingSeconds, setSleepTimer, cancelSleepTimer } = usePlayer();
  const isActive = sleepMinutes !== null;

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '0:00';
    if (seconds === -1) return 'End of track';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleSelect = (minutes: number) => {
    setSleepTimer(minutes);
    onClose();
  };

  const handleCancel = () => {
    cancelSleepTimer();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.panel} activeOpacity={1} onPress={() => {}}>
          <View style={styles.dragHandle} />
          
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="moon" size={24} color="#a78bfa" />
            </View>
            <Text style={styles.title}>Sleep Timer</Text>
            <Text style={styles.subtitle}>Music will stop after selected time</Text>
          </View>

          {isActive && (
            <View style={styles.activeContainer}>
              <LinearGradient colors={['rgba(167,139,250,0.15)', 'rgba(167,139,250,0.05)']} style={styles.activeGradient}>
                <View style={styles.activeContent}>
                  <Ionicons name="time" size={32} color="#a78bfa" />
                  <Text style={styles.activeTime}>{formatTime(sleepRemainingSeconds)}</Text>
                  <Text style={styles.activeLabel}>remaining</Text>
                </View>
              </LinearGradient>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={18} color="#ef4444" />
                <Text style={styles.cancelBtnText}>Cancel Timer</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.optionsGrid}>
            {TIMER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.minutes}
                style={[styles.optionCard, isActive && option.minutes === sleepMinutes && styles.optionCardActive]}
                onPress={() => handleSelect(option.minutes)}
                activeOpacity={0.7}
              >
                {isActive && option.minutes === sleepMinutes ? (
                  <LinearGradient colors={['#a78bfa', '#8b5cf6']} style={styles.optionCardGradient}>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.optionTextActive}>{option.label}</Text>
                  </LinearGradient>
                ) : (
                  <>
                    <Ionicons name={option.minutes === -1 ? 'musical-note' : 'timer-outline'} size={20} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.optionText}>{option.label}</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  panel: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, paddingTop: 8 },
  dragHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(167,139,250,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  activeContainer: { paddingHorizontal: 24, paddingVertical: 20, gap: 12 },
  activeGradient: { borderRadius: 16, padding: 20, alignItems: 'center' },
  activeContent: { alignItems: 'center', gap: 6 },
  activeTime: { fontSize: 32, color: '#a78bfa', fontWeight: '700' },
  activeLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.1)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  cancelBtnText: { fontSize: 14, color: '#ef4444', fontWeight: '600' },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  optionCard: { width: '30%', aspectRatio: 1.2, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  optionCardActive: { borderColor: '#a78bfa' },
  optionCardGradient: { width: '100%', height: '100%', borderRadius: 15, justifyContent: 'center', alignItems: 'center', gap: 8 },
  optionText: { fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  optionTextActive: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
