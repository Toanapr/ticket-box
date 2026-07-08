import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScannerStore } from '../lib/scanner/store';

export function HistoryScreen() {
  const { results } = useScannerStore();

  return (
    <View className="flex-1 bg-zinc-950 px-5 pt-4">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-white text-3xl font-black tracking-tight">History</Text>
        <View className="bg-zinc-800 px-4 py-2 rounded-full border border-zinc-700">
          <Text className="text-zinc-300 text-sm font-bold">{results.length} SYNCED</Text>
        </View>
      </View>

      {results.length === 0 ? (
        <View className="flex-1 items-center justify-center mb-20">
          <View className="bg-zinc-900 p-8 rounded-full mb-6 border border-zinc-800">
            <Ionicons name="server-outline" size={64} color="#71717a" />
          </View>
          <Text className="text-white font-bold text-xl mb-2">No History Yet</Text>
          <Text className="text-zinc-500 text-base text-center px-8">
            Scanned and synced tickets will appear here for conflict resolution.
          </Text>
        </View>
      ) : (
        <FlatList 
          data={[...results].reverse()}
          keyExtractor={(item) => item.clientEventId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => {
            const isAccepted = item.result === 'accepted';
            const isConflict = item.result === 'conflict';
            
            const badgeBg = isAccepted ? 'bg-emerald-500/20' : isConflict ? 'bg-amber-500/20' : 'bg-red-500/20';
            const badgeBorder = isAccepted ? 'border-emerald-500/30' : isConflict ? 'border-amber-500/30' : 'border-red-500/30';
            const textColor = isAccepted ? 'text-emerald-400' : isConflict ? 'text-amber-400' : 'text-red-400';
            const iconName = isAccepted ? 'checkmark-circle' : isConflict ? 'alert-circle' : 'close-circle';
            const iconColor = isAccepted ? '#10b981' : isConflict ? '#fbbf24' : '#f87171';
            
            return (
              <View className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 mb-4 shadow-xl">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-row items-center flex-1">
                    <Ionicons name={iconName} size={28} color={iconColor} />
                    <View className="ml-3 flex-1">
                      <Text className="text-white font-bold text-lg tracking-wider" numberOfLines={1}>
                        {item.clientEventId.split('-')[0]}...
                      </Text>
                      <Text className="text-zinc-500 text-xs font-medium mt-1">
                        Server Time: {new Date(item.serverRecordedAt || '').toLocaleTimeString()}
                      </Text>
                    </View>
                  </View>
                  
                  <View className={`border rounded-xl px-3 py-1.5 ${badgeBg} ${badgeBorder} ml-2`}>
                    <Text className={`text-xs font-black uppercase ${textColor}`}>
                      {item.result}
                    </Text>
                  </View>
                </View>
                
                {!isAccepted && item.reason && (
                  <View className="bg-red-950/30 p-3 rounded-xl mt-2 border border-red-900/50 flex-row">
                    <Ionicons name="information-circle-outline" size={16} color="#f87171" />
                    <Text className="text-red-300 text-xs ml-2 flex-1">{item.reason}</Text>
                  </View>
                )}
                
                {isConflict && item.winningEventId && (
                  <View className="bg-amber-950/30 p-3 rounded-xl mt-3 border border-amber-900/50 flex-row">
                    <Ionicons name="shield-half-outline" size={16} color="#fbbf24" />
                    <Text className="text-amber-300 text-xs font-bold ml-2 flex-1">
                      Winning ID: {item.winningEventId}
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
