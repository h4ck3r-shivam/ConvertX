import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthStore } from "@/lib/store";
import { authApi, ApiError } from "@/lib/api";
import { Loader } from "@/components/Loader";

export default function LoginScreen() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [serverUrl, setServerUrl] = React.useState("");
  const [showServerConfig, setShowServerConfig] = React.useState(false);

  const setToken = useAuthStore((s) => s.setToken);
  const setServerUrlStore = useAuthStore((s) => s.setServerUrl);
  const storedServerUrl = useAuthStore((s) => s.serverUrl);

  React.useEffect(() => {
    setServerUrl(storedServerUrl);
  }, [storedServerUrl]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      await setServerUrlStore(serverUrl);
      const response = await authApi.login(email, password);
      if (response.success && response.token) {
        await setToken(response.token);
        router.replace("/(tabs)");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert("Login Failed", error.message);
      } else {
        Alert.alert("Error", "Could not connect to server. Check your server URL.");
        setShowServerConfig(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-base">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-1 items-center justify-center px-6">
          {/* Crown Logo */}
          <View className="mb-8 items-center">
            <Text className="mb-2 text-4xl">👑</Text>
            <Text className="text-2xl font-bold text-neutral-100">Convertor King</Text>
            <Text className="mt-1 text-sm text-neutral-500">Self-hosted file converter</Text>
          </View>

          {/* Server URL Config */}
          {showServerConfig && (
            <View className="mb-4 w-full max-w-sm">
              <Text className="mb-1.5 text-sm font-medium text-neutral-300">Server URL</Text>
              <TextInput
                className="rounded-lg border border-border bg-surface-raised px-4 py-3 text-neutral-100"
                placeholder="http://your-server:3000"
                placeholderTextColor="#6b6b80"
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
          )}

          {/* Email */}
          <View className="mb-4 w-full max-w-sm">
            <Text className="mb-1.5 text-sm font-medium text-neutral-300">Email</Text>
            <TextInput
              className="rounded-lg border border-border bg-surface-raised px-4 py-3 text-neutral-100"
              placeholder="you@example.com"
              placeholderTextColor="#6b6b80"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>

          {/* Password */}
          <View className="mb-6 w-full max-w-sm">
            <Text className="mb-1.5 text-sm font-medium text-neutral-300">Password</Text>
            <TextInput
              className="rounded-lg border border-border bg-surface-raised px-4 py-3 text-neutral-100"
              placeholder="••••••••"
              placeholderTextColor="#6b6b80"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            className="w-full max-w-sm items-center rounded-lg bg-accent-500 px-4 py-3.5"
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <Loader size={24} />
            ) : (
              <Text className="font-semibold text-white">Login</Text>
            )}
          </TouchableOpacity>

          {/* Server Config Toggle */}
          <TouchableOpacity
            className="mt-4"
            onPress={() => setShowServerConfig(!showServerConfig)}
          >
            <Text className="text-sm text-accent-400">
              {showServerConfig ? "Hide server settings" : "Configure server"}
            </Text>
          </TouchableOpacity>

          {/* Register Link */}
          <TouchableOpacity
            className="mt-2"
            onPress={() => router.push("/(auth)/register")}
          >
            <Text className="text-sm text-neutral-400">
              Don't have an account? <Text className="text-accent-400">Register</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
