import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Share,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { jobsApi } from "@/lib/api";
import { Loader } from "@/components/Loader";
import { useAuthStore } from "@/lib/store";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export default function ResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const token = useAuthStore((s) => s.token);

  const { data, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: () => jobsApi.get(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const job = query.state.data?.job;
      if (job && (job.status === "pending" || job.status === "uploading")) {
        return 3000;
      }
      return false;
    },
  });

  const handleDownload = async (fileName: string, outputFileName: string) => {
    try {
      const downloadUrl = `${serverUrl.replace(/\/+$/, "")}/api/v1/jobs/${id}/download/${outputFileName}`;
      const localPath = `${FileSystem.documentDirectory}${outputFileName}`;

      const response = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64 = reader.result?.toString().split(",")[1];
        if (base64) {
          await FileSystem.writeAsStringAsync(localPath, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(localPath);
          } else {
            Alert.alert("Downloaded", `File saved to: ${localPath}`);
          }
        }
      };
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Download failed.");
    }
  };

  const handleShare = async (fileName: string, outputFileName: string) => {
    try {
      const downloadUrl = `${serverUrl.replace(/\/+$/, "")}/api/v1/jobs/${id}/download/${outputFileName}`;
      await Share.share({ url: downloadUrl, message: `Converted file: ${outputFileName}` });
    } catch {
      // Fallback to download
      handleDownload(fileName, outputFileName);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface-base">
        <Loader size={48} />
      </SafeAreaView>
    );
  }

  const job = data?.job;
  const files = data?.files || [];

  const isConverting = job?.status === "pending" || job?.status === "uploading";

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Text className="text-lg text-accent-400">← Back</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-neutral-100">Results</Text>
      </View>

      {/* Status Banner */}
      {isConverting && (
        <View className="mx-4 mb-4 flex-row items-center gap-3 rounded-lg border border-accent-500/30 bg-accent-500/10 p-4">
          <Loader size={28} />
          <View className="flex-1">
            <Text className="font-semibold text-accent-400">Converting...</Text>
            <Text className="text-sm text-neutral-500">
              {job?.finished_files || 0} of {job?.num_files || 0} files done
            </Text>
          </View>
        </View>
      )}

      {job?.status === "completed" && (
        <View className="mx-4 mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <Text className="font-semibold text-green-400">✓ Conversion Complete</Text>
          <Text className="text-sm text-neutral-500">{files.length} file(s) converted</Text>
        </View>
      )}

      {/* Files List */}
      <FlatList
        data={files}
        keyExtractor={(item) => String(item.id)}
        contentContainerClassName="px-4 pb-6"
        renderItem={({ item }) => (
          <View className="mb-3 rounded-lg border border-border-subtle bg-surface-raised p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-sm font-medium text-neutral-200" numberOfLines={1}>
                  {item.file_name}
                </Text>
                <Text className="mt-1 text-xs text-neutral-500" numberOfLines={1}>
                  → {item.output_file_name}
                </Text>
              </View>
              <View className="rounded-full bg-surface-overlay px-2.5 py-1">
                <Text className="text-xs text-neutral-400">{item.status}</Text>
              </View>
            </View>
            {item.status === "Done" && item.output_file_name && (
              <View className="mt-3 flex-row gap-2">
                <TouchableOpacity
                  className="flex-1 items-center rounded-md bg-accent-500 px-3 py-2"
                  onPress={() => handleDownload(item.file_name, item.output_file_name)}
                >
                  <Text className="text-sm font-medium text-white">Download</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 items-center rounded-md bg-surface-overlay px-3 py-2"
                  onPress={() => handleShare(item.file_name, item.output_file_name)}
                >
                  <Text className="text-sm font-medium text-accent-400">Share</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-sm text-neutral-500">No files in this job</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
