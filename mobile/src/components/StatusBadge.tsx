import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";
import type { ApprovalStatus } from "../types";

const colorFor: Record<ApprovalStatus, { bg: string; fg: string }> = {
  PENDING: { bg: "#3a2f0b", fg: theme.colors.warning },
  APPROVED: { bg: "#0f3020", fg: theme.colors.success },
  REJECTED: { bg: "#3a1414", fg: theme.colors.danger },
};

export function StatusBadge({ status }: { status: ApprovalStatus }) {
  const c = colorFor[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  text: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
});
