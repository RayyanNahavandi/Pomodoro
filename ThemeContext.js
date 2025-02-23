// ThemeContext.js
import React, { createContext, useState } from "react";

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // false means dark mode by default; set to true for light mode
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
