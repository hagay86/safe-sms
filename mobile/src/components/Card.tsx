import React from "react";
import { StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";
import { theme } from "../theme";

interface Props extends ViewProps {
  style?: ViewStyle;
  children: React.ReactNode;
}

export function Card({ style, children, ...rest }: Props) {
  return (
    <View {...rest} style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space(4),
    marginBottom: theme.space(3),
  },
});
