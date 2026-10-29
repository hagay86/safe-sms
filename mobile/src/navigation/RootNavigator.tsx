import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";
import { theme } from "../theme";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { SignupScreen } from "../screens/auth/SignupScreen";
import { InboxScreen } from "../screens/consumer/InboxScreen";
import { CompanyHomeScreen } from "../screens/company/CompanyHomeScreen";
import { CompanyDetailScreen } from "../screens/company/CompanyDetailScreen";
import { NewCompanyScreen } from "../screens/company/NewCompanyScreen";
import { NewSenderScreen } from "../screens/company/NewSenderScreen";
import { NewTemplateScreen } from "../screens/company/NewTemplateScreen";
import { SendMessageScreen } from "../screens/company/SendMessageScreen";
import { AdminQueueScreen } from "../screens/admin/AdminQueueScreen";
import { AccountScreen } from "../screens/shared/AccountScreen";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Main: undefined;
  CompanyDetail: { companyId: string };
  NewCompany: undefined;
  NewSender: { companyId: string };
  NewTemplate: { companyId: string };
  SendMessage: { companyId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.colors.bg,
    card: theme.colors.surface,
    border: theme.colors.border,
    primary: theme.colors.primary,
    text: theme.colors.text,
    notification: theme.colors.primary,
  },
};

function ConsumerTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.surface } }}>
      <Tabs.Screen name="Inbox" component={InboxScreen} />
      <Tabs.Screen name="Account" component={AccountScreen} />
    </Tabs.Navigator>
  );
}

function CompanyTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.surface } }}>
      <Tabs.Screen name="Companies" component={CompanyHomeScreen} />
      <Tabs.Screen name="Account" component={AccountScreen} />
    </Tabs.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.surface } }}>
      <Tabs.Screen name="Queue" component={AdminQueueScreen} options={{ title: "Moderation" }} />
      <Tabs.Screen name="Account" component={AccountScreen} />
    </Tabs.Navigator>
  );
}

function MainStack() {
  const { user } = useAuth();
  if (!user) return null;
  const TabRoot = user.role === "ADMIN" ? AdminTabs : user.role === "COMPANY" ? CompanyTabs : ConsumerTabs;

  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.surface } }}>
      <Stack.Screen name="Main" component={TabRoot} options={{ headerShown: false }} />
      <Stack.Screen name="CompanyDetail" component={CompanyDetailScreen} options={{ title: "Company" }} />
      <Stack.Screen name="NewCompany" component={NewCompanyScreen} options={{ title: "Register company" }} />
      <Stack.Screen name="NewSender" component={NewSenderScreen} options={{ title: "New sender ID" }} />
      <Stack.Screen name="NewTemplate" component={NewTemplateScreen} options={{ title: "New template" }} />
      <Stack.Screen name="SendMessage" component={SendMessageScreen} options={{ title: "Send SMS" }} />
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.surface } }}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Sign in" }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ title: "Create account" }} />
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  const { status } = useAuth();
  if (status === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  return (
    <NavigationContainer theme={navTheme}>
      {status === "authenticated" ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg },
});
