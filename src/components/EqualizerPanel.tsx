import React, { useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions, ScrollView, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';

const { height } = Dimensions.get('window');

const EQ_PRESETS = [
  { name: 'Flat', key: 'flat' },
  { name: 'Rock', key: 'rock' },
  { name: 'Pop', key: 'pop' },
  { name: 'Bass', key: 'bass' },
  { name: 'Vocal', key: 'vocal' },
  { name: 'Treble', key: 'treble' },
  { name: 'Electronic', key: 'electronic' },
];

const MIN = -10, MAX = 10;

interface Props {
  visible: boolean;
  onClose: () => void;
}

const EqSlider: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => {
  const trackWidth = useRef(0);
  const startX = useRef(0);
  const startValue = useRef(value);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  valueRef.current = value;
  onChangeRef.current = onChange;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        startX.current = e.nativeEvent.locationX;
        startValue.current = valueRef.current;
        if (trackWidth.current === 0) return;
        const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / trackWidth.current));
        onChangeRef.current(Math.round(MIN + ratio * (MAX - MIN)));
      },
      onPanResponderMove: (_, gs) => {
        if (trackWidth.current === 0) return;
        const newX = startX.current + gs.dx;
        const ratio = Math.max(0, Math.min(1, newX / trackWidth.current));
        onChangeRef.current(Math.round(MIN + ratio * (MAX - MIN)));
      },
    })
  ).current;

  const percent = ((value - MIN) / (MAX - MIN)) * 100;

  return (
    <View style={styles.sliderRow}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <View
        style={styles.sliderTrack}
        onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width; }}
        {...panResponder.panHandlers}
      >
        <View style={[styles.sliderFill, { width: `${percent}%` }]} />
        <View style={[styles.sliderThumb, { left: `${percent}%` as any }]} />
      </View>
      <Text style={styles.sliderValue}>{value > 0 ? '+' : ''}{value}</Text>
    </View>
  );
};

export const EqualizerPanel: React.FC<Props> = ({ visible, onClose }) => {
  const { eqBass, eqMid, eqTreble, setEqBass, setEqMid, setEqTreble, applyEqPreset } = usePlayer();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.panel} activeOpacity={1} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>Equalizer</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.presetsContainer}>
              <Text style={styles.presetsLabel}>Presets</Text>
              <View style={styles.presetsGrid}>
                {EQ_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.key}
                    style={styles.presetBtn}
                    onPress={() => applyEqPreset(preset.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetText}>{preset.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <EqSlider label="Bass" value={eqBass} onChange={setEqBass} />
            <EqSlider label="Mid" value={eqMid} onChange={setEqMid} />
            <EqSlider label="Treble" value={eqTreble} onChange={setEqTreble} />
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  panel: { backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40, maxHeight: height * 0.6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  content: { padding: 20 },
  presetsContainer: { marginBottom: 24 },
  presetsLabel: { fontSize: 14, color: '#888', marginBottom: 10 },
  presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: { backgroundColor: '#333', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  presetText: { fontSize: 12, color: '#fff' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 12 },
  sliderLabel: { fontSize: 14, color: '#fff', width: 50 },
  sliderTrack: { flex: 1, height: 4, backgroundColor: '#333', borderRadius: 2, position: 'relative', justifyContent: 'center' },
  sliderFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#7c3aed', borderRadius: 2 },
  sliderThumb: { position: 'absolute', top: -6, width: 16, height: 16, backgroundColor: '#fff', borderRadius: 8, marginLeft: -8, elevation: 3 },
  sliderValue: { fontSize: 13, color: '#7c3aed', width: 32, textAlign: 'right' },
});
