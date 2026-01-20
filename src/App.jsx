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
              <AllRoutes />
            </SocketProvider>
          </Suspense>
        </ScrollToTop>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#fff",
              color: "#363636",
              fontSize: "16px",
              padding: "16px 20px",
              minWidth: "300px",
            },
            success: {
              duration: 3000,
              style: {
                fontSize: "16px",
                padding: "16px 20px",
                minWidth: "300px",
              },
              iconTheme: {
                primary: "#4ade80",
                secondary: "#fff",
              },
            },
            error: {
              duration: 3000,
              style: {
                fontSize: "16px",
                padding: "16px 20px",
                minWidth: "300px",
              },
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
