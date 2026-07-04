import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthStore } from "@/lib/store";
import { authApi, ApiError } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Loader } from "@/components/Loader";

export default function SettingsScreen() {
  const [serverUrl, setServerUrl] = React.useState("");
  const [editingServer, setEditingServer] = React.useState(false);
  const [updatingAccount, setUpdatingAccount] = React.useState(false);
  const [newEmail, setNewEmail] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [currentPassword, setCurrentPassword] = React.useState("");

  const token = useAuthStore((s) => s.token);
  const storedServerUrl = useAuthStore((s) => s.serverUrl);
  const setServerUrlStore = useAuthStore((s) => s.setServerUrl);
  const logout = useAuthStore((s) => s.logout);

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
    enabled: !!token,
  });

  React.useEffect(() => {
    setServerUrl(storedServerUrl);
    if (meData?.user?.email) {
      setNewEmail(meData.user.email);
    }
  }, [storedServerUrl, meData]);

  const handleSaveServer = async () => {
    await setServerUrlStore(serverUrl);
    setEditingServer(false);
    Alert.alert("Saved", "Server URL updated.");
  };

  const handleUpdateAccount = async () => {
    if (!currentPassword) {
      Alert.alert("Error", "Enter your current password to make changes.");
      return;
    }

    setUpdatingAccount(true);
    try {
      await authApi.updateAccount({
        email: newEmail || undefined,
        newPassword: newPassword || undefined,
        password: currentPassword,
      });
      Alert.alert("Success", "Account updated.");
      setNewPassword("");
      setCurrentPassword("");
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Error", "Could not connect to server.");
      }
    } finally {
      setUpdatingAccount(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={["top"]}>
      {/* Header */}
      <View className="px-4 py-6">
        <Text className="text-3xl font-bold text-neutral-100">Settings</Text>
      </View>

      {/* Server Config */}
      <View className="mx-4 mb-6 rounded-lg border border-border-subtle bg-surface-raised p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-neutral-300">Server</Text>
          <TouchableOpacity onPress={() => setEditingServer(!editingServer)}>
            <Text className="text-sm text-accent-400">{editingServer ? "Cancel" : "Edit"}</Text>
          </TouchableOpacity>
        </View>
        {editingServer ? (
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 rounded-lg border border-border bg-surface-base px-3 py-2 text-neutral-100"
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://your-server:3000"
              placeholderTextColor="#6b6b80"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TouchableOpacity
              className="items-center justify-center rounded-lg bg-accent-500 px-4"
              onPress={handleSaveServer}
            >
              <Text className="font-medium text-white">Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text className="text-sm text-neutral-400" numberOfLines={1}>
            {storedServerUrl}
          </Text>
        )}
      </View>

      {/* Account */}
      <View className="mx-4 mb-6 rounded-lg border border-border-subtle bg-surface-raised p-4">
        <Text className="mb-4 text-sm font-semibold text-neutral-300">Account</Text>

        <Text className="mb-1 text-xs text-neutral-500">Email</Text>
        <TextInput
          className="mb-3 rounded-lg border border-border bg-surface-base px-3 py-2 text-neutral-100"
          value={newEmail}
          onChangeText={setNewEmail}
          placeholder="you@example.com"
          placeholderTextColor="#6b6b80"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        <Text className="mb-1 text-xs text-neutral-500">New Password (leave blank to keep)</Text>
        <TextInput
          className="mb-3 rounded-lg border border-border bg-surface-base px-3 py-2 text-neutral-100"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="••••••••"
          placeholderTextColor="#6b6b80"
          secureTextEntry
        />

        <Text className="mb-1 text-xs text-neutral-500">Current Password</Text>
        <TextInput
          className="mb-4 rounded-lg border border-border bg-surface-base px-3 py-2 text-neutral-100"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="••••••••"
          placeholderTextColor="#6b6b80"
          secureTextEntry
        />

        <TouchableOpacity
          className="items-center rounded-lg bg-accent-500 px-4 py-3"
          onPress={handleUpdateAccount}
          disabled={updatingAccount}
          activeOpacity={0.8}
        >
          {updatingAccount ? <Loader size={20} /> : <Text className="font-semibold text-white">Update Account</Text>}
        </TouchableOpacity>
      </View>

      {/* About */}
      <View className="mx-4 mb-6 rounded-lg border border-border-subtle bg-surface-raised p-4">
        <Text className="mb-2 text-sm font-semibold text-neutral-300">About</Text>
        <Text className="text-sm text-neutral-500">
          Convertor King v1.0.0{"\n"}
          Self-hosted file converter{"\n"}
          github.com/C4illin/ConvertX
        </Text>
      </View>

      {/* Logout */}
      <TouchableOpacity
        className="mx-4 items-center rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3.5"
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Text className="font-semibold text-red-400">Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
