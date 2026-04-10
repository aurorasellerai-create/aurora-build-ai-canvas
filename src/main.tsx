import { createRoot } from "react-dom/client";
import { useState, useCallback } from "react";
import App from "./App.tsx";
import SplashScreen from "./components/SplashScreen.tsx";
import "./index.css";

const Root = () => {
  const [ready, setReady] = useState(false);
  const handleFinish = useCallback(() => setReady(true), []);

  return (
    <>
      {!ready && <SplashScreen onFinish={handleFinish} />}
      <App />
    </>
  );
};

createRoot(document.getElementById("root")!).render(<Root />);
