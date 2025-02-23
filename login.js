import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { 
  getAuth,
  signInWithCredential,
  GoogleAuthProvider
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import Layout from "./components/layout";

WebBrowser.maybeCompleteAuthSession();

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: "YOUR_EXPO_CLIENT_ID",
    iosClientId: "YOUR_IOS_CLIENT_ID",
    androidClientId: "YOUR_ANDROID_CLIENT_ID",
    webClientId: "YOUR_WEB_CLIENT_ID",
  });

  // Log the full response to check its structure
  useEffect(() => {
    console.log("Google response:", response);
  }, [response]);

  // Process the Google sign-in response using the authentication property
  useEffect(() => {
    if (response?.type === "success" && response.authentication) {
      const { idToken, accessToken } = response.authentication;
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      signInWithCredential(auth, credential)
        .then(() => {
          navigation.replace("Home");
        })
        .catch((error) => {
          console.error("Firebase Google Sign-In error:", error);
          Alert.alert("Authentication Error", error.message);
        });
    }
  }, [response]);

  const handleEmailAuth = () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }
    // Implement email/password auth here if desired.
    navigation.replace("Home");
  };

  return (
    <Layout>
      <View style={styles.darkLoginContainer}>
        <View style={styles.darkLoginCard}>
          <Text style={styles.darkLoginTitle}>
            {isSignUp ? "Create Account" : "Sign In"}
          </Text>
          <TextInput
            style={styles.darkInput}
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.darkInput}
            placeholder="Password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.darkAuthButton} onPress={handleEmailAuth}>
            <Text style={styles.darkButtonText}>
              {isSignUp ? "Sign Up" : "Sign In"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={styles.darkToggleText}>
              {isSignUp
                ? "Already have an account? Sign In"
                : "Don't have an account? Create one"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.darkOrText}>OR</Text>
          <TouchableOpacity
            disabled={!request}
            onPress={() => promptAsync()}
            style={styles.darkAuthButton}
          >
            <Text style={styles.darkButtonText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  darkLoginContainer: {
    flex: 0,
    padding: 0,
    justifyContent: "flex-start",
    alignItems: "center",
    margin: -30,
  },
  darkLoginCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#1e1e1e",
    borderRadius: 15,
    padding: 30,
    alignItems: "center",
  },
  darkLoginTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#fff",
  },
  darkInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#333",
    padding: 12,
    marginBottom: 15,
    borderRadius: 10,
    backgroundColor: "#2c2c2c",
    color: "#fff",
  },
  darkAuthButton: {
    backgroundColor: "#61dafb",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 10,
    width: "100%",
    alignItems: "center",
  },
  darkToggleText: {
    color: "#61dafb",
    marginVertical: 10,
    textAlign: "center",
  },
  darkOrText: {
    marginVertical: 15,
    fontSize: 16,
    color: "#fff",
  },
  darkButtonText: {
    fontSize: 18,
    color: "#121212",
    fontWeight: "bold",
    textAlign: "center",
  },
});
