import { lazy, Suspense, useMemo, useState } from "react";
import { Outlet, RouteObject, useRoutes, BrowserRouter, useNavigate } from "react-router-dom";

const Loading = () => <p className="p-4 w-full h-full text-center">Loading...</p>;

const GameScreen = lazy(() => import("~/components/screens/GameScreen"));
const IndexScreen = lazy(() => import("~/components/screens/Index"));
const Page404Screen = lazy(() => import("~/components/screens/404"));

const LIGHT_THEME = "emerald";
const DARK_THEME = "custom";
const THEME_STORAGE_KEY = "app-theme";

let noTransitionsTimeout: null | ReturnType<typeof setTimeout>;

function Layout() {
  const [, _setToggle] = useState(false);
  const toggle = () => _setToggle((old) => !old);
  const navigate = useNavigate();

  useMemo(() => {
    document.documentElement.dataset.theme = localStorage.getItem(THEME_STORAGE_KEY) ?? LIGHT_THEME;
  }, []);

  return (
    <div className="">
      <nav className="h-header p-4 flex items-center justify-between gap-2">
        <span
          className="cursor-pointer"
          onClick={() => {
            navigate("/");
          }}
        >
          Wordle Party 🎊
        </span>
        <button
          type="button"
          className="link"
          onClick={() => {
            document.body.classList.add("no-transitions");

            document.documentElement.dataset.theme =
              document.documentElement.dataset.theme === LIGHT_THEME ? DARK_THEME : LIGHT_THEME;
            localStorage.setItem(THEME_STORAGE_KEY, document.documentElement.dataset.theme);
            toggle();

            noTransitionsTimeout != null && clearTimeout(noTransitionsTimeout);
            noTransitionsTimeout = setTimeout(() => {
              document.body.classList.remove("no-transitions");
            }, 300);
          }}
        >
          {document.documentElement.dataset.theme === LIGHT_THEME ? "Dark mode" : "Light mode"}
        </button>
      </nav>
      <Outlet />
    </div>
  );
}

export const Router = () => {
  return (
    <BrowserRouter>
      <InnerRouter />
    </BrowserRouter>
  );
};

const InnerRouter = () => {
  const routes: RouteObject[] = [
    {
      path: "/",
      element: <Layout />,
      children: [
        {
          index: true,
          element: <IndexScreen />,
        },
        {
          path: "/game/:gameID",
          element: <GameScreen />,
        },
        {
          path: "*",
          element: <Page404Screen />,
        },
      ],
    },
  ];
  const element = useRoutes(routes);
  return (
    <div>
      <Suspense fallback={<Loading />}>{element}</Suspense>
    </div>
  );
};
