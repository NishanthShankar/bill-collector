import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { BillList } from "./pages/BillList";
import { AddBill } from "./pages/AddBill";
import { Categories } from "./pages/Categories";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bills" element={<BillList />} />
        <Route path="/add" element={<AddBill />} />
        <Route path="/categories" element={<Categories />} />
      </Route>
    </Routes>
  );
}
