import React from "react";
import { View, Animated, Easing } from "react-native";
import { Svg, Circle, Path, Rect, G, Defs, LinearGradient, Stop } from "react-native-svg";

export function Loader({ size = 48 }: { size?: number }) {
  const spinValue = React.useRef(new Animated.Value(0)).current;
  const pulseValue = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 0.85,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    spin.start();
    pulse.start();
    return () => {
      spin.stop();
      pulse.stop();
    };
  }, [spinValue, pulseValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#a78bfa" />
            <Stop offset="1" stopColor="#7c3aed" />
          </LinearGradient>
          <LinearGradient id="crown" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#a78bfa" />
            <Stop offset="1" stopColor="#7c3aed" />
          </LinearGradient>
        </Defs>
        <Circle cx="32" cy="32" r="28" stroke="#2a2a3e" strokeWidth="3" fill="none" opacity="0.3" />
        <Animated.View
          style={{
            transform: [{ rotate: spin }],
            width: size,
            height: size,
            position: "absolute",
          }}
        >
          <Svg width={size} height={size} viewBox="0 0 64 64">
            <Path
              d="M32 4 a28 28 0 0 1 28 28"
              stroke="url(#ring)"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </Animated.View>
        <Animated.View
          style={{
            transform: [{ scale: pulseValue }],
            width: size,
            height: size,
            position: "absolute",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 32 32">
            <G transform="translate(16, 16)">
              <Path
                d="M-10,-4 L-10,6 L10,6 L10,-4 L6,-1 L3,-7 L0,-3 L-3,-7 L-6,-1 Z"
                fill="url(#crown)"
              />
              <Rect x="-10" y="6" width="20" height="3" rx="1.5" fill="#a78bfa" />
              <Circle cx="-6" cy="-1" r="1.5" fill="#c4b5fd" />
              <Circle cx="0" cy="-3" r="2" fill="#c4b5fd" />
              <Circle cx="6" cy="-1" r="1.5" fill="#c4b5fd" />
            </G>
          </Svg>
        </Animated.View>
      </Svg>
    </View>
  );
}
