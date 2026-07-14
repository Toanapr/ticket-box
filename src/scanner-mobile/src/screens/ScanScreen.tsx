import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useScannerStore } from '../lib/scanner/store';
import { validateLocalScan } from '../lib/scanner/scan';
import { buildPendingQueueEvent } from '../lib/scanner/queue-event';

export function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [feedback, setFeedback] = useState<'idle' | 'accepted' | 'rejected'>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [manualInputVisible, setManualInputVisible] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const cooldownRef = useRef(false);

  const {
    manifest,
    assignment,
    checkedInTicketRefs,
    recordPendingScan,
    queue,
  } = useScannerStore();
  
  const pendingCount = queue.filter(q => q.status === 'pending').length;

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (feedback !== 'idle') {
      timeout = setTimeout(() => {
        setFeedback('idle');
        setIsScanning(true);
      }, 1500);
    }
    return () => clearTimeout(timeout);
  }, [feedback]);

  if (!permission) {
    return <View className="flex-1 bg-zinc-950" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950 p-6">
        <View className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 items-center">
          <View className="bg-zinc-800 p-4 rounded-full mb-4">
            <Ionicons name="camera" size={32} color="#10b981" />
          </View>
          <Text className="text-white text-lg font-bold mb-2">Camera Access Required</Text>
          <Text className="text-zinc-400 text-center mb-6">
            We need your permission to use the camera for scanning tickets.
          </Text>
          <TouchableOpacity 
            className="bg-emerald-500 rounded-full px-8 py-4 w-full items-center" 
            onPress={requestPermission}
          >
            <Text className="text-white font-bold text-base">Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (cooldownRef.current || !isScanning) return;
    
    cooldownRef.current = true;
    setIsScanning(false);
    processScan(data);
    
    setTimeout(() => {
      cooldownRef.current = false;
    }, 1000);
  };

  const processScan = (rawValue: string) => {
    const validation = validateLocalScan({
      rawValue,
      manifest,
      assignment,
      checkedInTicketRefs: [
        ...checkedInTicketRefs,
        ...queue.map((item) => item.ticketRef),
      ],
    });

    if (!validation.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFeedback('rejected');
      setFeedbackMessage(validation.message);
      return;
    }

    try {
      const pendingEvent = buildPendingQueueEvent({
        assignment: assignment!,
        payload: validation.payload,
      });

      const recorded = recordPendingScan({
        ...pendingEvent,
        status: 'pending',
        syncAttempts: 0,
        lastSyncedAt: null,
        lastResultReason: null,
      });

      if (!recorded) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setFeedback('rejected');
        setFeedbackMessage('This ticket has already been recorded on this device.');
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFeedback('accepted');
      setFeedbackMessage(`${validation.ticket.ticketRef}`);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFeedback('rejected');
      setFeedbackMessage('Failed to queue ticket.');
    }
  };

  const handleManualSubmit = () => {
    if (manualValue.trim()) {
      processScan(manualValue);
      setManualValue('');
      setManualInputVisible(false);
    }
  };

  return (
    <View className="flex-1 bg-zinc-950 relative">
      <CameraView 
        style={StyleSheet.absoluteFillObject} 
        facing="back"
        onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />
      
      {/* Dark Overlay with Transparent Cutout */}
      <View className="flex-1 bg-black/60 justify-center items-center">
        {/* The Targeting Box */}
        <View className="w-72 h-72 relative justify-center items-center">
          {/* Animated Scanning Line (Fake for UI feel) */}
          {isScanning && (
            <View className="absolute top-1/2 left-4 right-4 h-0.5 bg-emerald-500/50 shadow-lg shadow-emerald-500 z-10" />
          )}

          {/* Corner Brackets */}
          <View className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-emerald-500 rounded-tl-3xl opacity-80" />
          <View className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-emerald-500 rounded-tr-3xl opacity-80" />
          <View className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-emerald-500 rounded-bl-3xl opacity-80" />
          <View className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-emerald-500 rounded-br-3xl opacity-80" />
        </View>
      </View>

      {/* Top Header info (Pill) */}
      <View className="absolute top-16 w-full items-center px-4">
        <View className="bg-zinc-900/90 flex-row items-center justify-between px-5 py-3 rounded-full border border-zinc-700/50 w-full shadow-2xl">
          <View className="flex-row items-center">
            <View className="bg-zinc-800 p-2 rounded-full mr-3">
              <Ionicons name="location" size={16} color="#10b981" />
            </View>
            <View>
              <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Current Zone</Text>
              <Text className="text-white font-bold text-sm">
                {assignment ? `${assignment.gateCode} / ${assignment.zoneCode}` : 'Unassigned'}
              </Text>
            </View>
          </View>

          <View className="items-end">
            <View className="bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
              <Text className="text-amber-400 text-xs font-black">{pendingCount} Wait</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Manual Input FAB */}
      <TouchableOpacity 
        className="absolute bottom-28 right-6 w-16 h-16 bg-zinc-900 rounded-full items-center justify-center border border-zinc-700 shadow-2xl elevation-xl"
        onPress={() => setManualInputVisible(true)}
      >
        <Ionicons name="keypad" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Feedback Flashes */}
      {feedback === 'accepted' && (
        <View className="absolute inset-0 border-[12px] border-emerald-500 justify-center items-center bg-emerald-950/40 z-50">
          <View className="bg-emerald-500 p-8 rounded-[40px] items-center shadow-2xl mx-8">
            <Ionicons name="checkmark-circle" size={80} color="#fff" />
            <Text className="text-white font-black text-3xl mt-4 mb-2">VALID</Text>
            <Text className="text-emerald-100 font-bold text-lg text-center tracking-widest">{feedbackMessage}</Text>
          </View>
        </View>
      )}

      {feedback === 'rejected' && (
        <View className="absolute inset-0 border-[12px] border-red-500 justify-center items-center bg-red-950/40 z-50">
          <View className="bg-red-500 p-8 rounded-[40px] items-center shadow-2xl mx-8">
            <Ionicons name="close-circle" size={80} color="#fff" />
            <Text className="text-white font-black text-3xl mt-4 mb-2 text-center">INVALID TICKET</Text>
            <Text className="text-red-100 font-bold text-base text-center">{feedbackMessage}</Text>
          </View>
        </View>
      )}

      {/* Manual Input Modal */}
      <Modal visible={manualInputVisible} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/80">
          <View className="bg-zinc-900 rounded-t-[40px] p-8 border-t border-zinc-800 shadow-2xl">
            <View className="flex-row items-center mb-6">
              <View className="bg-zinc-800 p-3 rounded-full mr-4">
                <Ionicons name="keypad-outline" size={24} color="#fff" />
              </View>
              <Text className="text-white font-bold text-xl">Manual Entry</Text>
            </View>

            <TextInput
              className="bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-4 text-white text-lg mb-6 shadow-inner"
              placeholder="Enter Ticket Reference ID..."
              placeholderTextColor="#52525b"
              value={manualValue}
              onChangeText={setManualValue}
              autoCapitalize="none"
              autoFocus
            />
            
            <View className="flex-row gap-4">
              <TouchableOpacity 
                className="flex-1 bg-zinc-800 rounded-2xl py-4 items-center border border-zinc-700"
                onPress={() => setManualInputVisible(false)}
              >
                <Text className="text-white font-bold text-base">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="flex-[2] bg-emerald-500 rounded-2xl py-4 flex-row justify-center items-center shadow-lg"
                onPress={handleManualSubmit}
              >
                <Ionicons name="arrow-forward-circle-outline" size={20} color="#fff" />
                <Text className="text-white font-bold text-base ml-2">Submit Ticket</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
