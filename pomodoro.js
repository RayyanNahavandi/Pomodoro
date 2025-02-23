import React, { useState, useEffect, useRef, createContext, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  Vibration,
  Alert,
} from "react-native";
import * as Notifications from "expo-notifications";
import * as Progress from "react-native-progress";
import { Audio } from "expo-av";
import Checkbox from "expo-checkbox";
import Layout from "./components/layout";

import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";

WebBrowser.maybeCompleteAuthSession();

// ================ Theme Context ================
const ThemeContext = createContext();
export const ThemeProvider = ({ children }) => {
  // Default to dark mode.
  const [isLightMode, setIsLightMode] = useState(false);
  const toggleTheme = () => setIsLightMode((prev) => !prev);
  const theme = isLightMode
    ? {
        background: "#ffffff",
        text: "#000000",
        inputBackground: "#f0f0f0",
        buttonBackground: "#ddd",
        buttonText: "#000",
      }
    : {
        background: "#1e1e1e",
        text: "#ffffff",
        inputBackground: "#333333",
        buttonBackground: "#61dafb",
        buttonText: "#282c34",
      };
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isLightMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
// ===============================================

// ================ Firebase Initialization ================
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  onAuthStateChanged,
  signInWithCredential,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  PhoneAuthProvider,
  signInWithCredential as signInWithPhoneCredential,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDsGRWDLhyug0HJIyBjd4Z0qF0x-QTeSjk",
  authDomain: "pomo-b7a9f.firebaseapp.com",
  databaseURL: "https://pomo-b7a9f-default-rtdb.firebaseio.com",
  projectId: "pomo-b7a9f",
  storageBucket: "pomo-b7a9f.firebasestorage.app",
  messagingSenderId: "1039140383526",
  appId: "1:1039140383526:web:1cd6d78dba7bee6b36efe7",
  measurementId: "G-QCCNLSKBDS",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
// ============================================================

const POMODORO_TIME = 25 * 60;
const SHORT_BREAK_TIME = 5 * 60;
const LONG_BREAK_TIME = 10 * 60;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function playSound() {
  const { sound } = await Audio.Sound.createAsync(
    require("./assets/alarm.mp3")
  );
  await sound.playAsync();
}

async function scheduleNotification(title, body) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}

// --------------------- HomeScreen (Pomodoro App) ---------------------
function HomeScreen() {
  const [timeLeft, setTimeLeft] = useState(POMODORO_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [points, setPoints] = useState(0);
  const [onBreak, setOnBreak] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [taskInput, setTaskInput] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [user, setUser] = useState(null);
  const intervalRef = useRef(null);

  // Consume theme context.
  const { theme, toggleTheme, isLightMode } = useContext(ThemeContext);

  // Listen to auth state changes.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Firebase current user:", currentUser);
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(intervalRef.current);
      if (soundOn) {
        playSound();
      }
      Vibration.vibrate(500);
      if (!onBreak) {
        setPoints((prevPoints) => prevPoints + 10);
        setSessionCount((prevCount) => prevCount + 1);
        setTimeLeft(
          sessionCount % 4 === 0 ? LONG_BREAK_TIME : SHORT_BREAK_TIME
        );
        setOnBreak(true);
        scheduleNotification("Break Time!", "Time to relax for a few minutes.");
      } else {
        setTimeLeft(POMODORO_TIME);
        setOnBreak(false);
        scheduleNotification("Work Session Started!", "Focus mode activated.");
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft, soundOn]);

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission not granted for notifications.");
      }
    })();
  }, []);

  const addTask = () => {
    if (taskInput.trim()) {
      const newTask = {
        id: Date.now().toString(),
        text: taskInput,
        completed: false,
      };
      setTasks([...tasks, newTask]);
      setTaskInput("");
    }
  };

  const toggleTask = (id, newValue) => {
    const updatedTasks = tasks.map((task) =>
      task.id === id ? { ...task, completed: newValue } : task
    );
    setTasks(updatedTasks);
  };

  const deleteTask = (id) => {
    const updatedTasks = tasks.filter((task) => task.id !== id);
    setTasks(updatedTasks);
  };

  const clearCompletedTasks = () => {
    setTasks(tasks.filter((task) => !task.completed));
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Layout style={{ backgroundColor: theme.background }}>
      {/* Theme toggle button at top right */}
      <View style={styles.themeToggleContainer}>
        <TouchableOpacity onPress={toggleTheme}>
          <Text style={[styles.themeToggleText, { color: theme.text }]}>
            Mode: {isLightMode ? "Light" : "Dark"}
          </Text>
        </TouchableOpacity>
      </View>
      
      {user ? (
        <Text style={[styles.welcomeText, { color: theme.text }]}>
          Welcome, {user.displayName ? user.displayName : user.email}
        </Text>
      ) : (
        <Text style={[styles.welcomeText, { color: theme.text }]}>No user signed in</Text>
      )}
      <View style={styles.headerRow}>
        <Text style={[styles.points, { color: theme.text }]}>Points: {points}</Text>
        <TouchableOpacity
          onPress={() => setSoundOn(!soundOn)}
          style={styles.soundToggle}
        >
          <Text style={styles.soundToggleText}>
            {soundOn ? "Sound: On" : "Sound: Off"}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.session, { color: theme.text }]}>
        {onBreak ? "Break Time!" : "Focus Mode"}
      </Text>
      <View style={styles.progressContainer}>
        <Progress.Circle
          size={150}
          progress={
            1 -
            timeLeft /
              (onBreak
                ? sessionCount % 4 === 0
                  ? LONG_BREAK_TIME
                  : SHORT_BREAK_TIME
                : POMODORO_TIME)
          }
          showsText
          formatText={() => formatTime(timeLeft)}
          color="#61dafb"
        />
      </View>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: theme.inputBackground, color: theme.text },
        ]}
        placeholder="Enter task"
        placeholderTextColor={isLightMode ? "#555" : "#aaa"}
        value={taskInput}
        onChangeText={setTaskInput}
      />
      <TouchableOpacity onPress={addTask} style={[styles.button, { backgroundColor: theme.buttonBackground }]}>
        <Text style={[styles.buttonText, { color: theme.buttonText }]}>Add Task</Text>
      </TouchableOpacity>
      <View style={styles.taskListContainer}>
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.taskContainer}>
              <Checkbox
                value={item.completed}
                onValueChange={(newValue) => toggleTask(item.id, newValue)}
                style={styles.checkbox}
                color={item.completed ? "#4630EB" : undefined}
              />
              <Text style={[styles.task, item.completed && styles.completedTask, { color: theme.text }]}>
                {item.text}
              </Text>
              <TouchableOpacity onPress={() => deleteTask(item.id)} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
      <View style={styles.extraButtonsContainer}>
        <TouchableOpacity onPress={clearCompletedTasks} style={[styles.button, { backgroundColor: theme.buttonBackground }]}>
          <Text style={[styles.buttonText, { color: theme.buttonText }]}>Clear Completed Tasks</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.circleButton} onPress={() => setIsRunning(!isRunning)}>
          <Text style={styles.buttonText}>{isRunning ? "Pause" : "Start"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.circleButton}
          onPress={() => {
            setIsRunning(false);
            setTimeLeft(POMODORO_TIME);
            setOnBreak(false);
          }}
        >
          <Text style={styles.buttonText}>Reset</Text>
        </TouchableOpacity>
      </View>
    </Layout>
  );
}

// --------------------- LoginScreen (Firebase Auth for Google & Email) ---------------------
function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: "YOUR_EXPO_CLIENT_ID",
    iosClientId: "YOUR_IOS_CLIENT_ID",
    androidClientId: "YOUR_ANDROID_CLIENT_ID",
    webClientId: "YOUR_WEB_CLIENT_ID",
  });

  useEffect(() => {
    console.log("Google response:", response);
  }, [response]);

  useEffect(() => {
    if (response?.type === "success") {
      const idToken =
        response.authentication?.idToken || response.params?.id_token;
      const accessToken =
        response.authentication?.accessToken || response.params?.access_token;
      console.log("Extracted idToken:", idToken);
      console.log("Extracted accessToken:", accessToken);
      if (idToken && accessToken) {
        const credential = GoogleAuthProvider.credential(idToken, accessToken);
        signInWithCredential(auth, credential)
          .then((userCredential) => {
            console.log("Firebase user (Google):", userCredential.user);
            navigation.replace("Home");
          })
          .catch((error) => {
            console.error("Firebase Google Sign-In error:", error);
            Alert.alert("Authentication Error", error.message);
          });
      } else {
        console.error("Tokens are missing in the Google response");
      }
    }
  }, [response]);

  const handleEmailAuth = () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }
    if (isSignUp) {
      createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) =>
          updateProfile(userCredential.user, {
            displayName: displayName || email.split("@")[0],
          })
        )
        .then(() => {
          navigation.replace("Home");
        })
        .catch((error) => {
          console.error("Authentication Error (Sign Up):", error);
          Alert.alert("Authentication Error", error.message);
        });
    } else {
      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          console.log("Firebase user (Email):", userCredential.user);
          navigation.replace("Home");
        })
        .catch((error) => {
          console.error("Authentication Error (Sign In):", error);
          Alert.alert("Authentication Error", error.message);
        });
    }
  };

  return (
    <Layout>
      <View style={styles.darkLoginContainer}>
        <View style={styles.darkLoginCard}>
          <Text style={styles.darkLoginTitle}>
            {isSignUp ? "Create Account" : "Sign In"}
          </Text>
          {isSignUp && (
            <TextInput
              style={styles.darkInput}
              placeholder="Display Name"
              placeholderTextColor="#888"
              value={displayName}
              onChangeText={setDisplayName}
            />
          )}
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
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Create one"}
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
          <TouchableOpacity
            onPress={() => navigation.navigate("PhoneLogin")}
            style={styles.darkAuthButton}
          >
            <Text style={styles.darkButtonText}>Sign in with Phone</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Layout>
  );
}

// --------------------- PhoneLoginScreen (Firebase Phone Auth) ---------------------
function PhoneLoginScreen({ navigation }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationId, setVerificationId] = useState(null);
  const [verificationCode, setVerificationCode] = useState("");
  const recaptchaVerifier = useRef(null);

  const sendVerification = async () => {
    if (!phoneNumber) {
      Alert.alert("Error", "Please enter a phone number.");
      return;
    }
    try {
      const verificationIdResult = await auth.signInWithPhoneNumber(
        phoneNumber,
        recaptchaVerifier.current
      );
      setVerificationId(verificationIdResult);
      Alert.alert("Code Sent", "A verification code has been sent to your phone.");
    } catch (err) {
      Alert.alert("Error sending code", err.message);
    }
  };

  const confirmCode = async () => {
    if (!verificationCode) {
      Alert.alert("Error", "Please enter the verification code.");
      return;
    }
    try {
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      await signInWithCredential(auth, credential);
      navigation.replace("Home");
    } catch (err) {
      Alert.alert("Error verifying code", err.message);
    }
  };

  return (
    <Layout>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
        attemptInvisibleVerification={true}
      />
      <TextInput
        style={styles.darkInput}
        placeholder="Phone Number (e.g., +1234567890)"
        placeholderTextColor="#888"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />
      <TouchableOpacity style={styles.darkAuthButton} onPress={sendVerification}>
        <Text style={styles.darkButtonText}>Send Verification Code</Text>
      </TouchableOpacity>
      {verificationId && (
        <>
          <TextInput
            style={styles.darkInput}
            placeholder="Verification Code"
            placeholderTextColor="#888"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
          />
          <TouchableOpacity style={styles.darkAuthButton} onPress={confirmCode}>
            <Text style={styles.darkButtonText}>Confirm Verification Code</Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity
        style={[styles.darkAuthButton, { marginTop: 20 }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.darkButtonText}>Back to Login</Text>
      </TouchableOpacity>
    </Layout>
  );
}

const Stack = createStackNavigator();

export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  // ---------- HomeScreen and Common Styles ----------
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  points: {
    fontSize: 24,
    marginBottom: 10,
  },
  soundToggle: {
    padding: 5,
    backgroundColor: "#61dafb",
    borderRadius: 5,
    marginTop: -12,
  },
  soundToggleText: {
    fontSize: 16,
  },
  session: {
    fontSize: 20,
    marginBottom: 10,
    alignSelf: "center",
  },
  progressContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 15,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  taskListContainer: {
    maxHeight: 60,
    marginVertical: 10,
  },
  taskContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
    width: "100%",
  },
  checkbox: {
    marginRight: 10,
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: "#fff",
  },
  task: {
    fontSize: 18,
    flex: 1,
  },
  completedTask: {
    textDecorationLine: "line-through",
    color: "gray",
  },
  deleteButton: {
    backgroundColor: "#ff4d4d",
    padding: 5,
    borderRadius: 5,
    marginLeft: 10,
  },
  deleteButtonText: {
    fontSize: 14,
    color: "#fff",
  },
  extraButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 10,
    flexWrap: "wrap",
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    marginTop: 10,
  },
  circleButton: {
    backgroundColor: "#61dafb",
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 30,
  },
  button: {
    backgroundColor: "#61dafb",
    padding: 15,
    borderRadius: 10,
    margin: 5,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  // ---------- Theme Toggle Styles (HomeScreen) ----------
  themeToggleContainer: {
    position: "absolute",
    top: 120,
    right: 20,
    zIndex: 10,
    padding: 5,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 5,
  },
  themeToggleText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  // ---------- Dark-Themed LoginScreen Styles ----------
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
    fontWeight: "bold",
    textAlign: "center",
  },
  welcomeText: {
    fontSize: 20,
    marginBottom: 10,
    textAlign: "center",
  },
});
