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

export default function RegisterScreen() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const setToken = useAuthStore((s) => s.setToken);

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.register(email, password);
      if (response.success && response.token) {
        await setToken(response.token);
        router.replace("/(tabs)");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        Alert.alert("Registration Failed", error.message);
      } else {
        Alert.alert("Error", "Could not connect to server.");
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
          <View className="mb-8 items-center">
            <Text className="mb-2 text-4xl">👑</Text>
            <Text className="text-2xl font-bold text-neutral-100">Create Account</Text>
            <Text className="mt-1 text-sm text-neutral-500">Join Convertor King</Text>
          </View>

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

          <TouchableOpacity
            className="w-full max-w-sm items-center rounded-lg bg-accent-500 px-4 py-3.5"
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <Loader size={24} /> : <Text className="font-semibold text-white">Register</Text>}
          </TouchableOpacity>

          <TouchableOpacity className="mt-4" onPress={() => router.back()}>
            <Text className="text-sm text-neutral-400">
              Already have an account? <Text className="text-accent-400">Login</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
