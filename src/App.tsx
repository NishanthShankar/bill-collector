import { Routes, Route } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { BillList } from "./pages/BillList";
import { AddBill } from "./pages/AddBill";
import { Categories } from "./pages/Categories";
import { GmailIntegration } from "./pages/GmailIntegration";
import { Login } from "./pages/Login";

export default function App() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center bg-surface">
          <div className="text-on-surface-variant text-sm">Loading...</div>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <Login />
      </Unauthenticated>

      <Authenticated>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/bills" element={<BillList />} />
            <Route path="/add" element={<AddBill />} />
            <Route path="/organizations" element={<Categories />} />
            <Route path="/gmail" element={<GmailIntegration />} />
          </Route>
        </Routes>
      </Authenticated>
    </>
  );
}
