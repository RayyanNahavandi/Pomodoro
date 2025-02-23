import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Layout({ children }) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pomodoro Timer</Text>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#282c34",
    padding: 20,
  },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#61dafb",
    marginBottom: 20,
  },
  content: {
    backgroundColor: "#444",
    padding: 20,
    borderRadius: 10,
    width: "90%",
    alignSelf:"center",
    alignItems: "stretch",
  },
});
