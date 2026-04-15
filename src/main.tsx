import { createRoot } from "react-dom/client";
import { useState, useCallback, useEffect } from "react";
import App from "./App.tsx";
import SplashScreen from "./components/SplashScreen.tsx";
import "./index.css";

const Root = () => {
  const [ready, setReady] = useState(false);
  const handleFinish = useCallback(() => setReady(true), []);

  // Preload critical route chunk
  useEffect(() => {
    import("./pages/Index");
  }, []);

  return (
    <>
      {!ready && <SplashScreen onFinish={handleFinish} />}
      <div style={ready ? undefined : { visibility: "hidden", position: "absolute" }}>
        <App />
      </div>
    </>
  );
};

createRoot(document.getElementById("root")!).render(<Root />);
