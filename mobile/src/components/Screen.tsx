import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function Screen({ children, scroll = true, style, contentStyle }: Props) {
  const insets = useSafeAreaInsets();
  const content = scroll ? (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + theme.space(3), paddingBottom: insets.bottom + theme.space(6) },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.container,
        styles.content,
        { paddingTop: insets.top + theme.space(3), paddingBottom: insets.bottom + theme.space(6) },
        style,
      ]}
    >
      {children}
    </View>
  );
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {content}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.bg },
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.space(4) },
});
