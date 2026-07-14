import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useScannerStore } from "../lib/scanner/store";
import { ScannerApiClient } from "../lib/scanner/api-client";
import { parseScannerSetupQr } from "../lib/scanner/setup-qr";
import type { ScannerConnectionConfig } from "../lib/scanner/types";

export function SetupScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const {
    connectionConfig,
    setConnectionConfig,
    assignment,
    setAssignment,
    manifest,
    setManifest,
  } = useScannerStore();

  const [baseUrl, setBaseUrl] = useState(connectionConfig?.baseUrl ?? "");
  const [deviceId, setDeviceId] = useState(connectionConfig?.deviceId ?? "");
  const [accessToken, setAccessToken] = useState(
    connectionConfig?.accessToken ?? "",
  );
  const [isFetchingAssignment, setIsFetchingAssignment] = useState(false);
  const [isFetchingManifest, setIsFetchingManifest] = useState(false);
  const [setupScannerVisible, setSetupScannerVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setupScanLockedRef = useRef(false);

  async function handleFetchAssignment() {
    if (!baseUrl || !deviceId || !accessToken) {
      setError("Please fill all connection fields.");
      return;
    }

    const config = { baseUrl, deviceId, accessToken };
    await connectWithConfig(config);
  }

  async function connectWithConfig(config: ScannerConnectionConfig) {
    setError(null);
    setIsFetchingAssignment(true);
    setConnectionConfig(config);
    setAssignment(null);
    setManifest(null);

    try {
      const client = new ScannerApiClient(config);
      const response = await client.getAssignment();
      setAssignment(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load assignment",
      );
    } finally {
      setIsFetchingAssignment(false);
    }
  }

  async function openSetupScanner() {
    setError(null);
    if (!cameraPermission?.granted) {
      const nextPermission = await requestCameraPermission();
      if (!nextPermission.granted) {
        setError("Camera permission is required to scan the setup QR.");
        return;
      }
    }
    setupScanLockedRef.current = false;
    setSetupScannerVisible(true);
  }

  function handleSetupQrScanned({ data }: { data: string }) {
    if (setupScanLockedRef.current) return;
    setupScanLockedRef.current = true;

    try {
      const config = parseScannerSetupQr(data);
      setBaseUrl(config.baseUrl);
      setDeviceId(config.deviceId);
      setAccessToken(config.accessToken);
      setSetupScannerVisible(false);
      void connectWithConfig(config);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Invalid setup QR.");
      setSetupScannerVisible(false);
    }
  }

  async function handleFetchManifest() {
    if (!connectionConfig || !assignment) {
      setError("Load assignment first.");
      return;
    }

    setError(null);
    setIsFetchingManifest(true);

    try {
      const client = new ScannerApiClient(connectionConfig);
      const manifestRes = await client.getManifest({
        assignmentId: assignment.assignmentId,
      });
      setManifest(manifestRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load manifest");
    } finally {
      setIsFetchingManifest(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-zinc-950 p-5">
      {/* 1. Connection Card */}
      <View className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 mb-6 shadow-2xl">
        <View className="flex-row items-center mb-6 border-b border-zinc-800 pb-4">
          <Ionicons name="hardware-chip-outline" size={20} color="#10b981" />
          <Text className="text-zinc-300 font-bold tracking-widest uppercase ml-2">
            Device Connection
          </Text>
        </View>

        <TouchableOpacity
          className="mb-6 flex-row items-center justify-center rounded-2xl border border-emerald-500/50 bg-emerald-500/10 py-4"
          onPress={() => void openSetupScanner()}
        >
          <Ionicons name="qr-code-outline" size={21} color="#34d399" />
          <Text className="ml-2 text-base font-bold text-emerald-400">
            Scan Setup QR
          </Text>
        </TouchableOpacity>

        <View className="mb-6 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-zinc-800" />
          <Text className="text-xs font-bold uppercase tracking-widest text-zinc-600">
            or enter manually
          </Text>
          <View className="h-px flex-1 bg-zinc-800" />
        </View>

        <View className="mb-5">
          <Text className="text-zinc-400 text-sm mb-2 font-medium">
            API Base URL
          </Text>
          <View className="flex-row items-center bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3">
            <Ionicons name="link-outline" size={18} color="#71717a" />
            <TextInput
              className="flex-1 text-white ml-3 text-base"
              placeholder="https://api.example.com"
              placeholderTextColor="#52525b"
              value={baseUrl}
              onChangeText={setBaseUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </View>

        <View className="mb-5">
          <Text className="text-zinc-400 text-sm mb-2 font-medium">
            Device ID
          </Text>
          <View className="flex-row items-center bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3">
            <Ionicons name="phone-portrait-outline" size={18} color="#71717a" />
            <TextInput
              className="flex-1 text-white ml-3 text-base"
              placeholder="Scanner-01"
              placeholderTextColor="#52525b"
              value={deviceId}
              onChangeText={setDeviceId}
            />
          </View>
        </View>

        <View className="mb-8">
          <Text className="text-zinc-400 text-sm mb-2 font-medium">
            Access Token
          </Text>
          <View className="flex-row items-center bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3">
            <Ionicons name="key-outline" size={18} color="#71717a" />
            <TextInput
              className="flex-1 text-white ml-3 text-base"
              placeholder="ey..."
              placeholderTextColor="#52525b"
              value={accessToken}
              onChangeText={setAccessToken}
              secureTextEntry
            />
          </View>
        </View>

        <TouchableOpacity
          className="bg-emerald-500 active:bg-emerald-600 rounded-2xl py-4 flex-row justify-center items-center"
          onPress={handleFetchAssignment}
          disabled={isFetchingAssignment}
        >
          {isFetchingAssignment ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-download-outline" size={20} color="#fff" />
              <Text className="text-white font-bold text-base ml-2">
                Connect & Fetch
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {error && (
        <View className="bg-red-950/40 border border-red-900 rounded-2xl p-4 mb-6 flex-row items-center">
          <Ionicons name="alert-circle" size={24} color="#f87171" />
          <Text className="text-red-400 ml-3 flex-1">{error}</Text>
        </View>
      )}

      {/* 2. Active Assignment Card */}
      {assignment && (
        <View className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 mb-6 shadow-2xl">
          <View className="flex-row items-center mb-6 border-b border-zinc-800 pb-4">
            <Ionicons name="id-card-outline" size={20} color="#10b981" />
            <Text className="text-zinc-300 font-bold tracking-widest uppercase ml-2">
              Active Assignment
            </Text>
          </View>

          <View className="flex-row items-center justify-between bg-zinc-950 p-4 rounded-2xl border border-zinc-800 mb-4">
            <View>
              <Text className="text-zinc-500 text-xs font-bold uppercase mb-1">
                Gate
              </Text>
              <Text className="text-white font-black text-2xl">
                {assignment.gateCode}
              </Text>
            </View>
            <View className="h-10 w-px bg-zinc-800" />
            <View>
              <Text className="text-zinc-500 text-xs font-bold uppercase mb-1 text-right">
                Zone
              </Text>
              <Text className="text-white font-black text-2xl text-right">
                {assignment.zoneCode}
              </Text>
            </View>
          </View>

          <Text className="text-zinc-400 text-sm mb-6 text-center">
            Event ID:{" "}
            <Text className="font-bold text-zinc-300">
              {assignment.eventId}
            </Text>
          </Text>

          <TouchableOpacity
            className="bg-zinc-800 active:bg-zinc-700 border border-zinc-700 rounded-2xl py-4 flex-row justify-center items-center"
            onPress={handleFetchManifest}
            disabled={isFetchingManifest}
          >
            {isFetchingManifest ? (
              <ActivityIndicator color="#10b981" />
            ) : (
              <>
                <Ionicons name="sync-outline" size={20} color="#10b981" />
                <Text className="text-emerald-500 font-bold text-base ml-2">
                  Download Offline Manifest
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Manifest Status */}
      {manifest && (
        <View className="bg-emerald-950/30 border border-emerald-900/50 rounded-3xl p-6 mb-10 flex-row items-center">
          <View className="bg-emerald-900/50 p-3 rounded-full mr-4">
            <Ionicons name="checkmark-done" size={24} color="#10b981" />
          </View>
          <View className="flex-1">
            <Text className="text-emerald-400 text-lg font-bold mb-1">
              System Ready
            </Text>
            <Text className="text-emerald-500/70 text-sm font-medium">
              Loaded {manifest.tickets.length} tickets. Offline mode active.
            </Text>
          </View>
        </View>
      )}

      <Modal
        visible={setupScannerVisible}
        animationType="slide"
        onRequestClose={() => setSetupScannerVisible(false)}
      >
        <View className="flex-1 bg-black">
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleSetupQrScanned}
          />
          <View className="flex-1 items-center justify-between bg-black/45 px-6 pb-12 pt-16">
            <View className="rounded-full border border-white/20 bg-black/70 px-5 py-3">
              <Text className="text-center text-sm font-bold uppercase tracking-widest text-white">
                Scan Admin Provision QR
              </Text>
            </View>
            <View className="h-72 w-72 rounded-[36px] border-4 border-emerald-400 bg-transparent" />
            <TouchableOpacity
              className="w-full rounded-2xl border border-white/20 bg-zinc-900 py-4"
              onPress={() => setSetupScannerVisible(false)}
            >
              <Text className="text-center text-base font-bold text-white">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
