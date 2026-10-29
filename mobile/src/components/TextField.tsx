import React from "react";
import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { theme } from "../theme";

interface Props extends TextInputProps {
  label: string;
  error?: string | null;
  helper?: string;
}

export function TextField({ label, error, helper, style, ...rest }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.textMuted}
        {...rest}
        style={[styles.input, error ? styles.inputError : null, style]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: theme.space(3) },
  label: {
    ...theme.text.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.space(1),
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space(3),
    paddingVertical: theme.space(3),
    fontSize: 16,
  },
  inputError: { borderColor: theme.colors.danger },
  error: { color: theme.colors.danger, marginTop: theme.space(1), fontSize: 12 },
  helper: { color: theme.colors.textMuted, marginTop: theme.space(1), fontSize: 12 },
});
