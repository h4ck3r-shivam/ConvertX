import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { jobsApi, convertersApi } from "@/lib/api";
import { Loader } from "@/components/Loader";
import { canConvertNatively, convertFile } from "@/lib/convert";
import { isOnline } from "@/lib/sync";
import { insertJob, insertFile } from "@/lib/db";
import { useAuthStore } from "@/lib/store";
import * as FileSystem from "expo-file-system";

interface SelectedFile {
  uri: string;
  name: string;
  size: number;
  type: string;
}

export default function HomeScreen() {
  const [selectedFiles, setSelectedFiles] = React.useState<SelectedFile[]>([]);
  const [convertTargets, setConvertTargets] = React.useState<Record<string, string[]>>({});
  const [selectedTarget, setSelectedTarget] = React.useState<string>("");
  const [converting, setConverting] = React.useState(false);
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  // Fetch converters list
  const { data: convertersData } = useQuery({
    queryKey: ["converters"],
    queryFn: () => convertersApi.list(),
    enabled: !!token,
  });

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const files: SelectedFile[] = result.assets.map((a) => ({
        uri: a.uri,
        name: a.name,
        size: a.size,
        type: a.mimeType || "",
      }));

      setSelectedFiles(files);

      // Get possible targets for the first file type
      if (files.length > 0) {
        const ext = files[0]!.name.split(".").pop() || "";
        try {
          const targetsResp = await convertersApi.targets(ext);
          if (targetsResp.success) {
            setConvertTargets(targetsResp.targets);
          }
        } catch {
          // Offline - show native-capable targets
          setConvertTargets({});
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick files.");
    }
  };

  const handleConvert = async () => {
    if (selectedFiles.length === 0) {
      Alert.alert("No files", "Please select files first.");
      return;
    }

    if (!selectedTarget) {
      Alert.alert("No target", "Please select a conversion target.");
      return;
    }

    setConverting(true);
    const [target, converterName] = selectedTarget.split(",");
    const fileNames = selectedFiles.map((f) => f.name);
    const ext = selectedFiles[0]!.name.split(".").pop() || "";

    try {
      const online = await isOnline();

      if (online) {
        // Online: use server API
        const createResp = await jobsApi.create();
        if (!createResp.success) throw new Error("Failed to create job");

        await jobsApi.upload(
          createResp.jobId,
          selectedFiles.map((f) => ({ uri: f.uri, name: f.name, type: f.type || "application/octet-stream" })),
        );

        const convertResp = await jobsApi.convert(createResp.jobId, selectedTarget, fileNames);
        if (convertResp.success) {
          Alert.alert("Success", "Conversion started on server.", [
            { text: "View Results", onPress: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }) },
          ]);
          setSelectedFiles([]);
          setSelectedTarget("");
        }
      } else {
        // Offline: try native conversion
        if (canConvertNatively(ext, target || "")) {
          const outputDir = `${FileSystem.documentDirectory}conversions/`;
          const dirInfo = await FileSystem.getInfoAsync(outputDir);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(outputDir, { intermediates: true });
          }

          const results = await Promise.all(
            selectedFiles.map((f) => convertFile(f.uri, ext, target || "", outputDir)),
          );

          const successCount = results.filter((r) => r.success).length;
          const failCount = results.length - successCount;

          // Store in local DB
          const jobId = `local_${Date.now()}`;
          await insertJob({
            id: jobId,
            user_id: 0,
            date_created: new Date().toISOString(),
            status: successCount === results.length ? "completed" : "partial",
            num_files: results.length,
            synced: false,
          });

          for (let i = 0; i < results.length; i++) {
            const r = results[i]!;
            await insertFile({
              job_id: jobId,
              file_name: selectedFiles[i]!.name,
              output_file_name: r.outputUri ? r.outputUri.split("/").pop() || "" : "",
              status: r.success ? "Done" : "Failed",
              local_uri: r.outputUri,
            });
          }

          Alert.alert(
            "Conversion Complete",
            `${successCount} file(s) converted${failCount > 0 ? `, ${failCount} failed` : ""}.`,
          );
          setSelectedFiles([]);
          setSelectedTarget("");
          queryClient.invalidateQueries({ queryKey: ["jobs"] });
        } else {
          Alert.alert(
            "Offline",
            `Cannot convert ${ext} to ${target} offline. This conversion requires a server. Please try again when online.`,
          );
        }
      }
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Conversion failed.");
    } finally {
      setConverting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-6"
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => queryClient.invalidateQueries()} tintColor="#8b5cf6" />}
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-neutral-100">Convert Files</Text>
          <Text className="mt-1 text-sm text-neutral-500">
            Select files and choose a target format
          </Text>
        </View>

        {/* Dropzone */}
        <TouchableOpacity
          className="items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-raised py-12"
          onPress={pickFiles}
          activeOpacity={0.7}
        >
          <Text className="mb-2 text-5xl">📁</Text>
          <Text className="text-lg font-semibold text-neutral-200">Tap to select files</Text>
          <Text className="mt-1 text-sm text-neutral-500">Any format supported by your server</Text>
        </TouchableOpacity>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <View className="mt-6">
            <Text className="mb-3 text-sm font-semibold text-neutral-300">
              Selected ({selectedFiles.length})
            </Text>
            {selectedFiles.map((file, idx) => (
              <View
                key={idx}
                className="mb-2 flex-row items-center justify-between rounded-lg border border-border-subtle bg-surface-raised px-4 py-3"
              >
                <View className="flex-1">
                  <Text className="text-sm font-medium text-neutral-200" numberOfLines={1}>
                    {file.name}
                  </Text>
                  <Text className="text-xs text-neutral-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))}
                >
                  <Text className="text-accent-400">Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Conversion Targets */}
        {selectedFiles.length > 0 && (
          <View className="mt-6">
            <Text className="mb-3 text-sm font-semibold text-neutral-300">Convert to</Text>
            {Object.keys(convertTargets).length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {Object.entries(convertTargets).map(([converter, targets]) =>
                  targets.map((target) => (
                    <TouchableOpacity
                      key={`${target},${converter}`}
                      className={`rounded-lg px-4 py-2 ${
                        selectedTarget === `${target},${converter}`
                          ? "bg-accent-500"
                          : "bg-surface-overlay"
                      }`}
                      onPress={() => setSelectedTarget(`${target},${converter}`)}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          selectedTarget === `${target},${converter}`
                            ? "text-white"
                            : "text-neutral-300"
                        }`}
                      >
                        {target}
                      </Text>
                    </TouchableOpacity>
                  )),
                )}
              </View>
            ) : (
              <Text className="text-sm text-neutral-500">
                No targets available. Check server connection.
              </Text>
            )}
          </View>
        )}

        {/* Convert Button */}
        {selectedFiles.length > 0 && (
          <TouchableOpacity
            className="mt-6 items-center rounded-lg bg-accent-500 px-4 py-4"
            onPress={handleConvert}
            disabled={converting || !selectedTarget}
            activeOpacity={0.8}
            style={{ opacity: converting || !selectedTarget ? 0.5 : 1 }}
          >
            {converting ? (
              <View className="flex-row items-center gap-3">
                <Loader size={24} />
                <Text className="font-semibold text-white">Converting...</Text>
              </View>
            ) : (
              <Text className="font-semibold text-white">Convert Now</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Converters Count */}
        {convertersData?.success && (
          <View className="mt-8 rounded-lg border border-border-subtle bg-surface-raised p-4">
            <Text className="text-sm text-neutral-400">
              {convertersData.converters.length} converters available on your server
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
