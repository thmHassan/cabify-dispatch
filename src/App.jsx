import { Provider } from "react-redux";
import { Suspense } from "react";
import store from "./store";
import { BrowserRouter } from "react-router-dom";
import appConfig from "./components/configs/app.config";
import mockServer from "./mock";
import AllRoutes from "./components/routes/AllRoutes";
import ScrollToTop from "./components/shared/ScrollToTop";
import Loading from "./components/shared/Loading/Loading";

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
            <AllRoutes />
          </Suspense>
        </ScrollToTop>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
