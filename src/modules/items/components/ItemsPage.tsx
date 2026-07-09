"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Container } from "react-bootstrap";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { Label } from "@/shared/components/ui/Label";
import { ApiError } from "@/shared/services/apiClient";
import { createItem, deleteItem, listItems, updateItem } from "../services/itemApi";
import type { Item, ItemPayload } from "../types";

type FormState = ItemPayload;
type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = { name: "", description: "" };

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Name is required.";
  if (!form.description.trim()) errors.description = "Description is required.";
  return errors;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="field-error">{message}</span>;
}

export function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listItems();
      setItems(result.data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load items.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditingItem(null);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function startEdit(item: Item) {
    setEditingItem(item);
    setForm({ name: item.name, description: item.description });
    setErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validateForm(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
      };

      if (editingItem) {
        await updateItem(editingItem.id, payload);
        toast.success("Item updated.");
      } else {
        await createItem(payload);
        toast.success("Item created.");
      }

      resetForm();
      await loadItems();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save item.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: Item) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;

    setDeletingId(item.id);
    try {
      await deleteItem(item.id);
      toast.success("Item deleted.");
      if (editingItem?.id === item.id) resetForm();
      await loadItems();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete item.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="account-page">
      <Container>
        <div className="account-page__header">
          <h1 className="account-page__title">Items</h1>
          <p className="account-page__subtitle">Sample CRUD page — list, create, update, and delete.</p>
        </div>

        <div className="account-card" style={{ marginBottom: 24 }}>
          <h2 className="profile-settings__section-heading">
            {editingItem ? "Edit Item" : "Create Item"}
          </h2>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <Label htmlFor="item-name">
                Name <span className="required-star">*</span>
              </Label>
              <Input
                id="item-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Item name"
                style={errors.name ? { borderColor: "#e02424" } : undefined}
              />
              <FieldError message={errors.name} />
            </div>

            <div className="form-group">
              <Label htmlFor="item-description">
                Description <span className="required-star">*</span>
              </Label>
              <textarea
                id="item-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Item description"
                className="form-control"
                rows={3}
                style={errors.description ? { borderColor: "#e02424" } : undefined}
              />
              <FieldError message={errors.description} />
            </div>

            <div className="profile-settings__actions">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editingItem ? "Update Item" : "Create Item"}
              </Button>
              {editingItem ? (
                <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="account-card">
          <h2 className="profile-settings__section-heading">All Items</h2>
          {loading ? (
            <div className="account-page__loading">Loading…</div>
          ) : items.length === 0 ? (
            <p className="account-page__subtitle mb-0">No items yet. Create your first one above.</p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th style={{ width: 160 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.description}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button type="button" variant="outline" onClick={() => startEdit(item)}>
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                          >
                            {deletingId === item.id ? "Deleting…" : "Delete"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}
