import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsApi } from "@/lib/api";
import { Loader } from "@/components/Loader";
import { deleteLocalJob } from "@/lib/db";
import { isOnline } from "@/lib/sync";

export default function HistoryScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: serverData, isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => jobsApi.list(),
    enabled: true,
    refetchInterval: 10_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (jobIds: string[]) => jobsApi.delete(jobIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const handleDelete = (jobId: string) => {
    Alert.alert("Delete Job", "Are you sure you want to delete this job?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const online = await isOnline();
            if (online) {
              await deleteMutation.mutateAsync([jobId]);
            }
            await deleteLocalJob(jobId);
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
          } catch {
            Alert.alert("Error", "Failed to delete job.");
          }
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    setRefreshing(false);
  };

  const jobs = serverData?.jobs || [];

  const renderJob = ({ item }: { item: any }) => {
    const date = new Date(item.date_created).toLocaleString();
    const isComplete = item.status === "completed";
    const isPending = item.status === "pending" || item.status === "uploading";

    return (
      <TouchableOpacity
        className="mb-3 rounded-lg border border-border-subtle bg-surface-raised p-4"
        onPress={() => router.push(`/results/${item.id}`)}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-sm font-semibold text-neutral-200">
              {item.num_files} file{item.num_files !== 1 ? "s" : ""}
            </Text>
            <Text className="mt-1 text-xs text-neutral-500">{date}</Text>
          </View>
          <View className="items-end gap-2">
            <View
              className={`rounded-full px-3 py-1 ${
                isComplete
                  ? "bg-accent-500/20"
                  : isPending
                    ? "bg-yellow-500/20"
                    : "bg-neutral-700"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  isComplete ? "text-accent-400" : isPending ? "text-yellow-400" : "text-neutral-400"
                }`}
              >
                {item.status}
              </Text>
            </View>
            <Text className="text-xs text-neutral-500">
              {item.finished_files}/{item.num_files} done
            </Text>
          </View>
        </View>
        <View className="mt-3 flex-row gap-2">
          <TouchableOpacity
            className="rounded-md bg-surface-overlay px-3 py-1.5"
            onPress={() => router.push(`/results/${item.id}`)}
          >
            <Text className="text-xs text-accent-400">View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="rounded-md bg-surface-overlay px-3 py-1.5"
            onPress={() => handleDelete(String(item.id))}
          >
            <Text className="text-xs text-red-400">Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={["top"]}>
      <View className="px-4 py-6">
        <Text className="text-3xl font-bold text-neutral-100">History</Text>
        <Text className="mt-1 text-sm text-neutral-500">Your conversion history</Text>
      </View>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Loader size={48} />
        </View>
      ) : jobs.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-2 text-5xl">📭</Text>
          <Text className="text-lg font-semibold text-neutral-300">No conversions yet</Text>
          <Text className="mt-1 text-sm text-neutral-500">
            Convert some files to see them here
          </Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderJob}
          contentContainerClassName="px-4 pb-6"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
          }
        />
      )}
    </SafeAreaView>
  );
}
