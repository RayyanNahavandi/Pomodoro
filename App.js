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
import { Feather } from '@expo/vector-icons'; // Import Feather icons for the gear icon

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

// --------------------- Settings Screen ---------------------
function SettingsScreen({ navigation, route }) {
  const { theme, toggleTheme, isLightMode } = useContext(ThemeContext);
  
  // Get the sound state and toggle function from route params
  const soundEnabled = route.params?.soundEnabled || false;
  const toggleSound = route.params?.toggleSound || (() => {});
  
  // Add state for display name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [updateMessage, setUpdateMessage] = useState({ text: "", isError: false });

  // Get current user on component mount
  useEffect(() => {
    const user = auth.currentUser;
    setCurrentUser(user);
    if (user && user.displayName) {
      setNewDisplayName(user.displayName);
    }
  }, []);

  // Function to update display name
  const updateDisplayName = async () => {
    if (!newDisplayName.trim()) {
      setUpdateMessage({ text: "Display name cannot be empty", isError: true });
      return;
    }

    try {
      if (currentUser) {
        await updateProfile(currentUser, {
          displayName: newDisplayName.trim()
        });
        
        // Force refresh of current user data
        setCurrentUser({...auth.currentUser});
        
        setUpdateMessage({ text: "Display name updated successfully!", isError: false });
        setIsEditingName(false);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setUpdateMessage({ text: "", isError: false });
        }, 3000);
      }
    } catch (error) {
      console.error("Error updating display name:", error);
      setUpdateMessage({ text: `Error: ${error.message}`, isError: true });
    }
  };
  
  return (
    <Layout style={{ backgroundColor: theme.background }}>
      <View style={styles.settingsContainer}>
        <Text style={[styles.settingsTitle, { color: theme.text }]}>Settings</Text>
        
        {/* Profile Section */}
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Profile</Text>
          
          {currentUser && (
            <View style={styles.profileSection}>
              <Text style={[styles.profileLabel, { color: theme.text }]}>
                {isEditingName ? "Edit Display Name:" : "Display Name:"}
              </Text>
              
              {isEditingName ? (
                <View style={styles.nameEditContainer}>
                  <TextInput
                    style={[
                      styles.nameInput,
                      { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.text }
                    ]}
                    value={newDisplayName}
                    onChangeText={setNewDisplayName}
                    placeholder="Enter new display name"
                    placeholderTextColor={isLightMode ? "#555" : "#aaa"}
                  />
                  <View style={styles.nameEditButtons}>
                    <TouchableOpacity
                      style={[styles.settingsButton, { backgroundColor: "#4CAF50", marginRight: 8 }]}
                      onPress={updateDisplayName}
                    >
                      <Text style={[styles.settingsButtonText, { color: "#fff" }]}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.settingsButton, { backgroundColor: "#f44336" }]}
                      onPress={() => {
                        setIsEditingName(false);
                        setNewDisplayName(currentUser.displayName || "");
                        setUpdateMessage({ text: "", isError: false });
                      }}
                    >
                      <Text style={[styles.settingsButtonText, { color: "#fff" }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.profileInfoRow}>
                  <Text style={[styles.profileValue, { color: theme.text }]}>
                    {currentUser.displayName || "No display name set"}
                  </Text>
                  <TouchableOpacity 
                    style={[styles.settingsButton, { backgroundColor: theme.buttonBackground }]}
                    onPress={() => setIsEditingName(true)}
                  >
                    <Text style={[styles.settingsButtonText, { color: theme.buttonText }]}>Edit</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {updateMessage.text ? (
                <Text 
                  style={[
                    styles.updateMessage, 
                    { color: updateMessage.isError ? "#f44336" : "#4CAF50" }
                  ]}
                >
                  {updateMessage.text}
                </Text>
              ) : null}
            </View>
          )}
        </View>
        
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Appearance</Text>
          <View style={styles.settingsRow}>
            <Text style={[styles.settingsLabel, { color: theme.text }]}>Theme</Text>
            <TouchableOpacity 
              style={[styles.settingsButton, { backgroundColor: theme.buttonBackground }]}
              onPress={toggleTheme}
            >
              <Text style={[styles.settingsButtonText, { color: theme.buttonText }]}>
                {isLightMode ? "Switch to Dark" : "Switch to Light"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Audio</Text>
          <View style={styles.settingsRow}>
            <Text style={[styles.settingsLabel, { color: theme.text }]}>Sound Effects  </Text>
            <TouchableOpacity 
              style={[styles.settingsButton, { backgroundColor: theme.buttonBackground }]}
              onPress={() => {
                // Call the toggleSound function from HomeScreen
                toggleSound();
                // Force a UI update with a temporary state update
                navigation.setParams({
                  soundEnabled: !soundEnabled,
                  toggleSound: toggleSound
                });
              }}
            >
              <Text style={[styles.settingsButtonText, { color: theme.buttonText }]}>
                {soundEnabled ? "On" : "Off"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Account</Text>
          <TouchableOpacity 
            style={[styles.settingsButton, styles.logoutButton]}
            onPress={() => {
              auth.signOut()
                .then(() => navigation.replace('Login'))
                .catch(error => Alert.alert('Error signing out', error.message));
            }}
          >
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[styles.settingsButton, { backgroundColor: theme.buttonBackground, marginTop: 20 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.settingsButtonText, { color: theme.buttonText }]}>Back to Timer</Text>
        </TouchableOpacity>
      </View>
    </Layout>
  );
}
// --------------------- HomeScreen (Pomodoro App) ---------------------
function HomeScreen({ navigation }) {
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
      {/* Settings icon at top right */}
      <View style={styles.headerIconsContainer}>
      <TouchableOpacity 
  style={styles.settingsIconButton}
  onPress={() => navigation.navigate('Settings', {
    soundEnabled: soundOn,
    toggleSound: () => setSoundOn(prev => !prev)
  })}
>
  <Feather name="settings" size={24} color={theme.text} />
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
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}
const additionalStyles = {
  // Profile section styles
  profileSection: {
    width: '100%',
    marginBottom: 20,
  },
  profileLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  profileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  profileValue: {
    fontSize: 16,
    flex: 1,
  },
  nameEditContainer: {
    width: '100%',
  },
  nameInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  nameEditButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  updateMessage: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
  }
};
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
  // ---------- Header Icons Container (HomeScreen) ----------
  headerIconsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end", // Changed from space-between to flex-end
    alignItems: "center",
    width: "100%",
    position: "absolute",
    top: 50, // Changed from 120 to 50 (or whatever top value works for your layout)
    right: 20,
    zIndex: 10,
  },
  themeToggleText: {
    fontSize: 16,
    fontWeight: "bold",
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 5,
    borderRadius: 5,
  },
  settingsIconButton: {
    padding: 8,
    backgroundColor: "rgba(97, 218, 251, 0.8)",
    borderRadius: 5,
    marginRight: 0, // Changed from 10 to 0
    marginTop: 0, // Changed from -12 to 0
  },
  // ---------- Settings Screen Styles ----------
  settingsContainer: {
    flex: 0,
    padding: 0,
    width: "100%",
  },
  settingsTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  settingsSection: {
    marginBottom: 30,
    width: "100%",
  },
  settingsSectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#61dafb",
    paddingBottom: 5,
  },
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  settingsLabel: {
    fontSize: 18,
  },
  settingsButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: "#ff4d4d",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#fff",
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
  profileSection: additionalStyles.profileSection,
  profileLabel: additionalStyles.profileLabel,
  profileInfoRow: additionalStyles.profileInfoRow,
  profileValue: additionalStyles.profileValue,
  nameEditContainer: additionalStyles.nameEditContainer,
  nameInput: additionalStyles.nameInput,
  nameEditButtons: additionalStyles.nameEditButtons,
  updateMessage: additionalStyles.updateMessage,
});
