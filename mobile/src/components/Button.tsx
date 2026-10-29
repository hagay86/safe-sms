import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { theme } from "../theme";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = "primary", disabled, loading, style }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant].button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles[variant].text.color} />
      ) : (
        <Text style={[styles.text, variantStyles[variant].text]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    paddingHorizontal: theme.space(5),
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  text: { ...theme.text.button },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});

const variantStyles: Record<Variant, { button: ViewStyle; text: { color: string } }> = {
  primary: {
    button: { backgroundColor: theme.colors.primary },
    text: { color: theme.colors.primaryText },
  },
  secondary: {
    button: { backgroundColor: theme.colors.surfaceElevated, borderWidth: 1, borderColor: theme.colors.border },
    text: { color: theme.colors.text },
  },
  danger: {
    button: { backgroundColor: theme.colors.danger },
    text: { color: theme.colors.primaryText },
  },
  ghost: {
    button: { backgroundColor: "transparent" },
    text: { color: theme.colors.primary },
  },
};
