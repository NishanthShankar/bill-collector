import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { getCategoryStyle, categoryColorStyles } from "@/lib/styles";

export function Categories() {
  const categories = useQuery(api.categories.list);
  const categoryColors = useQuery(api.appConfig.get, { key: "categoryColors" }) as
    | { value: string; label: string }[]
    | null;
  const categoryIcons = useQuery(api.appConfig.get, { key: "categoryIcons" }) as string[] | null;
  const createCategory = useMutation(api.categories.create);
  const updateCategory = useMutation(api.categories.update);
  const removeCategory = useMutation(api.categories.remove);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("primary");
  const [icon, setIcon] = useState("person");

  const colorOptions = categoryColors ?? [];
  const iconOptions = categoryIcons ?? [];

  function resetForm() {
    setName("");
    setColor("primary");
    setIcon("person");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(cat: { _id: string; name: string; color: string; icon: string }) {
    setEditingId(cat._id);
    setName(cat.name);
    setColor(cat.color);
    setIcon(cat.icon);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      await updateCategory({
        id: editingId as Id<"categories">,
        name,
        color,
        icon,
      });
    } else {
      await createCategory({ name, color, icon });
    }
    resetForm();
  }

  return (
    <div className="p-10 max-w-4xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-headline font-bold text-primary">
          Categories
        </h2>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-headline font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Category
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-surface-container-lowest rounded-xl shadow-sm p-6 space-y-4"
        >
          <h3 className="font-headline font-bold text-primary">
            {editingId ? "Edit Category" : "New Category"}
          </h3>

          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant/30 text-sm focus:ring-1 focus:ring-primary"
              placeholder="e.g. Personal"
            />
          </div>

          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              Color
            </label>
            <div className="flex gap-2">
              {colorOptions.map((c) => {
                const style = categoryColorStyles[c.value];
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      color === c.value
                        ? "ring-2 ring-primary ring-offset-2"
                        : ""
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${style?.bar ?? "bg-primary"}`} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {iconOptions.map((ico) => (
                <button
                  key={ico}
                  type="button"
                  onClick={() => setIcon(ico)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                    icon === ico
                      ? "bg-primary text-white shadow-sm"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {ico}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-headline font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              {editingId ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-2.5 rounded-lg bg-surface-container-low text-on-surface-variant font-headline font-semibold text-sm hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories?.map((cat) => {
          const style = getCategoryStyle(cat.color);
          return (
            <div
              key={cat._id}
              className={`bg-surface-container-lowest p-6 rounded-xl shadow-sm border-t-2 ${style.border}`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`p-2 ${style.bg} rounded-lg`}>
                  <span className={`material-symbols-outlined ${style.iconText}`}>
                    {cat.icon}
                  </span>
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(cat)}
                    className="p-1.5 hover:bg-surface-container-high rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant text-sm">
                      edit
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this category?")) {
                        removeCategory({ id: cat._id });
                      }
                    }}
                    className="p-1.5 hover:bg-error-container rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-error text-sm">
                      delete
                    </span>
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-headline font-bold text-primary">
                {cat.name}
              </h3>
            </div>
          );
        })}
        {categories?.length === 0 && (
          <p className="text-on-surface-variant col-span-full text-center py-12">
            No categories yet. Create one to get started.
          </p>
        )}
      </div>
    </div>
  );
}
