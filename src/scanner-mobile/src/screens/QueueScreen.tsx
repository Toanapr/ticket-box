import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScannerStore } from '../lib/scanner/store';
import { ScannerApiClient } from '../lib/scanner/api-client';

export function QueueScreen() {
  const { queue, replaceQueue, replaceResults, results, setLastSuccessfulSyncAt, connectionConfig, assignment, manifest } = useScannerStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingItems = queue.filter(q => q.status === 'pending');

  const handleSync = async () => {
    if (!connectionConfig || !assignment || !manifest || pendingItems.length === 0) return;
    
    setIsSyncing(true);
    setError(null);

    const client = new ScannerApiClient(connectionConfig);
    
    try {
      const payload = {
        assignmentId: assignment.assignmentId,
        manifestVersion: manifest.version,
        events: pendingItems.map(item => ({
          clientEventId: item.clientEventId,
          ticketRef: item.ticketRef,
          rawToken: item.rawToken,
          scannerUserId: item.scannerUserId,
          deviceId: item.deviceId,
          eventId: item.eventId,
          gateCode: item.gateCode,
          zoneCode: item.zoneCode,
          clientScannedAt: item.clientScannedAt,
        })),
      };

      const response = await client.syncCheckIns(payload);

      // Merge results
      const newResults = [
        ...results.filter(r => !response.results.some(inc => inc.clientEventId === r.clientEventId)),
        ...response.results
      ];
      replaceResults(newResults);

      const ackMap = new Map(response.results.map(r => [r.clientEventId, r]));
      
      const reconciledQueue = queue.map(item => {
        if (item.status !== 'pending') return item;
        const ack = ackMap.get(item.clientEventId);
        if (!ack) return item;
        if (ack.result === 'accepted') {
          return { ...item, status: 'accepted' as const, lastSyncedAt: ack.serverRecordedAt };
        }
        return { ...item, status: ack.result, lastSyncedAt: ack.serverRecordedAt, lastResultReason: ack.reason };
      });

      replaceQueue(reconciledQueue.filter(q => q.status === 'pending' || q.status === 'conflict' || q.status === 'rejected'));
      setLastSuccessfulSyncAt(response.processedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View className="flex-1 bg-zinc-950 px-5 pt-4">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-white text-3xl font-black tracking-tight">Queue</Text>
        <View className="bg-amber-500/20 px-4 py-2 rounded-full border border-amber-500/30 flex-row items-center">
          <Ionicons name="cloud-offline-outline" size={16} color="#fbbf24" />
          <Text className="text-amber-400 text-sm font-bold ml-2">{pendingItems.length} PENDING</Text>
        </View>
      </View>

      {error && (
        <View className="bg-red-950/40 border border-red-900 rounded-2xl p-4 mb-4 flex-row items-center">
          <Ionicons name="warning-outline" size={24} color="#f87171" />
          <Text className="text-red-400 ml-3 flex-1 font-medium">{error}</Text>
        </View>
      )}

      {pendingItems.length === 0 ? (
        <View className="flex-1 items-center justify-center mb-20">
          <View className="bg-zinc-900 p-8 rounded-full mb-6 border border-zinc-800">
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#10b981" />
          </View>
          <Text className="text-white font-bold text-xl mb-2">All Caught Up!</Text>
          <Text className="text-zinc-500 text-base text-center px-8">
            There are no pending scans in the offline queue. You're fully synced.
          </Text>
        </View>
      ) : (
        <FlatList 
          data={pendingItems}
          keyExtractor={(item) => item.clientEventId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <View className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4 shadow-lg flex-row items-center">
              <View className="bg-amber-500/10 p-3 rounded-full mr-4 border border-amber-500/20">
                <Ionicons name="time-outline" size={24} color="#fbbf24" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-lg mb-1 tracking-wider">{item.ticketRef}</Text>
                <Text className="text-zinc-500 text-xs font-medium">
                  Scanned: {new Date(item.clientScannedAt).toLocaleTimeString()}
                </Text>
              </View>
              <View className="bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700">
                <Text className="text-zinc-400 text-xs font-bold uppercase">Pending</Text>
              </View>
            </View>
          )}
        />
      )}

      {pendingItems.length > 0 && (
        <TouchableOpacity 
          className="absolute bottom-6 left-5 right-5 bg-emerald-500 rounded-full py-4 flex-row justify-center items-center shadow-2xl elevation-2xl"
          onPress={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
              <Text className="text-white font-bold text-lg ml-3">
                Push Sync ({pendingItems.length})
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
