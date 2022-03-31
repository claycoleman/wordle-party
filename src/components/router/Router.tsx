import { Dialog } from "@headlessui/react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Outlet, RouteObject, useRoutes, BrowserRouter, useNavigate } from "react-router-dom";

const Loading = () => <p className="p-4 w-full h-full text-center">Loading...</p>;

const GameScreen = lazy(() => import("~/components/screens/GameScreen"));
const IndexScreen = lazy(() => import("~/components/screens/Index"));
const Page404Screen = lazy(() => import("~/components/screens/404"));

const LIGHT_THEME = "emerald";
const DARK_THEME = "custom";
const THEME_STORAGE_KEY = "app-theme";

function Layout() {
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.dataset.theme = localStorage.getItem(THEME_STORAGE_KEY) ?? LIGHT_THEME;
  }, []);

  return (
    <div>
      <nav className="p-4 flex items-center justify-between gap-2">
        <span
          className="cursor-pointer"
          onClick={() => {
            navigate("/");
          }}
        >
          Wordle Party
        </span>
        <button
          type="button"
          className="link"
          onClick={() => {
            document.documentElement.dataset.theme =
              document.documentElement.dataset.theme === LIGHT_THEME ? DARK_THEME : LIGHT_THEME;
            localStorage.setItem(THEME_STORAGE_KEY, document.documentElement.dataset.theme);
          }}
        >
          Toggle theme
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
