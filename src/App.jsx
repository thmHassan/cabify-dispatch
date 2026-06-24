import { Provider } from "react-redux";
import { Suspense } from "react";
import store from "./store";
import { BrowserRouter } from "react-router-dom";
import appConfig from "./components/configs/app.config";
import mockServer from "./mock";
import AllRoutes from "./components/routes/AllRoutes";
import ScrollToTop from "./components/shared/ScrollToTop";
import Loading from "./components/shared/Loading/Loading";
import { Toaster } from "react-hot-toast";
import { SocketProvider } from "./components/routes/SocketProvider";
import { MapConfigurationProvider } from "./contexts/MapConfigurationContext";
import { CompanyDateTimeProvider } from "./contexts/CompanyDateTimeContext";

const environment = import.meta.env.VITE_NODE_ENV;

if (appConfig.enableMock) {
  mockServer({ environment });
}

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <ScrollToTop>
          <Suspense fallback={<Loading />}>
            <SocketProvider>
              <CompanyDateTimeProvider>
                  <MapConfigurationProvider>
                    <AllRoutes />
                  </MapConfigurationProvider>
                </CompanyDateTimeProvider>
            </SocketProvider>
          </Suspense>
        </ScrollToTop>
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={16}
          containerClassName="toast-stack-container"
          containerStyle={{
            top: 88,
            right: 16,
            zIndex: 10050,
          }}
          toastOptions={{
            duration: 3000,
            pauseOnHover: true,
            style: {
              background: "#fff",
              color: "#363636",
              fontSize: "14px",
              padding: "12px 16px",
              minWidth: "280px",
              maxWidth: "min(420px, calc(100vw - 32px))",
              margin: 0,
              borderRadius: "12px",
              boxShadow: "0 10px 30px rgba(17, 24, 39, 0.12)",
              border: "1px solid rgba(0, 0, 0, 0.06)",
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: "#4ade80",
                secondary: "#fff",
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: "#ef4444",
                secondary: "#fff",
              },
            },
          }}
        />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
