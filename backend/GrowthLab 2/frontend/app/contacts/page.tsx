"use client";

import { type CSSProperties, type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { API_URL } from "../../lib/api";

type Contact = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  source?: string;
  createdAt?: string;
};

type ContactForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  source: string;
};

const emptyForm: ContactForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  position: "",
  source: "manual",
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [draftContacts, setDraftContacts] = useState<Record<string, { email: string; phone: string }>>({});
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Loading contacts...");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadContacts();
  }, []);

  const filteredContacts = useMemo(() => {
    const search = query.trim().toLowerCase();

    return contacts.filter((contact) =>
      [
        contact.firstName,
        contact.lastName,
        contact.email,
        contact.phone,
        contact.company,
        contact.position,
        contact.source,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [contacts, query]);

  async function loadContacts() {
    try {
      const response = await fetch(`${API_URL}/contacts`);

      if (!response.ok) {
        throw new Error(`Contacts load failed: ${response.status}`);
      }

      const data = (await response.json()) as Contact[];
      setContacts(data);
      setDraftContacts(
        Object.fromEntries(data.map((contact) => [contact.id, { email: contact.email ?? "", phone: contact.phone ?? "" }])),
      );
      setStatus(`${data.length} contacts in database.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Contacts load failed.");
    }
  }

  async function createContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("Adding contact...");

    try {
      const response = await fetch(`${API_URL}/contacts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cleanForm(form)),
      });

      if (!response.ok) {
        throw new Error(`Create failed: ${response.status}`);
      }

      setForm(emptyForm);
      await loadContacts();
      setStatus("Contact added.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setBusy(true);
    setStatus(`Importing ${file.name}...`);

    try {
      const body = new FormData();
      body.append("file", file);
      const isExcel = /\.(xlsx|xls)$/i.test(file.name);
      const endpoint = isExcel ? "excel" : "csv";
      const response = await fetch(`${API_URL}/contacts/import/${endpoint}`, {
        method: "POST",
        body,
      });

      if (!response.ok) {
        throw new Error(`Import failed: ${response.status}`);
      }

      const data = (await response.json()) as { imported: number; skippedDuplicates: number };
      await loadContacts();
      setStatus(`Imported ${data.imported}; skipped duplicates ${data.skippedDuplicates}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function deduplicate() {
    setBusy(true);
    setStatus("Removing duplicates...");

    try {
      const response = await fetch(`${API_URL}/contacts/deduplicate`, { method: "POST" });

      if (!response.ok) {
        throw new Error(`Deduplicate failed: ${response.status}`);
      }

      const data = (await response.json()) as { skippedDuplicates: number };
      await loadContacts();
      setStatus(`Removed ${data.skippedDuplicates} duplicates.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Deduplicate failed.");
    } finally {
      setBusy(false);
    }
  }

  async function updateContact(id: string) {
    const draft = draftContacts[id];

    if (!draft) {
      return;
    }

    setBusy(true);
    setStatus("Saving contact...");

    try {
      const response = await fetch(`${API_URL}/contacts/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: draft.email.trim() || undefined,
          phone: draft.phone.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Save failed: ${response.status}`);
      }

      await loadContacts();
      setStatus("Contact saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteContact(id: string) {
    setBusy(true);
    setStatus("Deleting contact...");

    try {
      const response = await fetch(`${API_URL}/contacts/${id}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }

      await loadContacts();
      setStatus("Contact deleted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>CRM</p>
          <h1 style={styles.title}>Contacts</h1>
        </div>
        <div style={styles.actions}>
          <label style={styles.uploadButton}>
            Import CSV/XLSX
            <input accept=".csv,.xlsx,.xls,text/csv" onChange={importFile} style={styles.fileInput} type="file" />
          </label>
          <button disabled={busy} onClick={deduplicate} style={styles.secondaryButton}>
            Deduplicate
          </button>
          <button disabled={busy} onClick={loadContacts} style={styles.secondaryButton}>
            Refresh
          </button>
        </div>
      </section>

      <form onSubmit={createContact} style={styles.form}>
        <input
          aria-label="First name"
          onChange={(event) => setForm({ ...form, firstName: event.target.value })}
          placeholder="First name"
          style={styles.input}
          value={form.firstName}
        />
        <input
          aria-label="Last name"
          onChange={(event) => setForm({ ...form, lastName: event.target.value })}
          placeholder="Last name"
          style={styles.input}
          value={form.lastName}
        />
        <input
          aria-label="Email"
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          placeholder="Email"
          style={styles.input}
          value={form.email}
        />
        <input
          aria-label="Phone"
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
          placeholder="Phone"
          style={styles.input}
          value={form.phone}
        />
        <input
          aria-label="Company"
          onChange={(event) => setForm({ ...form, company: event.target.value })}
          placeholder="Company"
          style={styles.input}
          value={form.company}
        />
        <input
          aria-label="Position"
          onChange={(event) => setForm({ ...form, position: event.target.value })}
          placeholder="Position"
          style={styles.input}
          value={form.position}
        />
        <button disabled={busy || (!form.email && !form.phone)} style={styles.primaryButton} type="submit">
          Add Contact
        </button>
      </form>

      <section style={styles.toolbar}>
        <input
          aria-label="Search contacts"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search contacts"
          style={styles.search}
          value={query}
        />
        <span style={styles.meta}>
          {filteredContacts.length} of {contacts.length} contacts. {status}
        </span>
      </section>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Phone</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Company</th>
              <th style={styles.th}>Position</th>
              <th style={styles.th}>Source</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredContacts.map((contact) => (
              <tr key={contact.id}>
                <td style={styles.td}>
                  <strong>{contactName(contact)}</strong>
                </td>
                <td style={styles.td}>
                  <input
                    aria-label={`Phone for ${contactName(contact)}`}
                    onChange={(event) =>
                      setDraftContacts({
                        ...draftContacts,
                        [contact.id]: {
                          email: draftContacts[contact.id]?.email ?? contact.email ?? "",
                          phone: event.target.value,
                        },
                      })
                    }
                    style={styles.tableInput}
                    value={draftContacts[contact.id]?.phone ?? contact.phone ?? ""}
                  />
                </td>
                <td style={styles.td}>
                  <input
                    aria-label={`Email for ${contactName(contact)}`}
                    onChange={(event) =>
                      setDraftContacts({
                        ...draftContacts,
                        [contact.id]: {
                          email: event.target.value,
                          phone: draftContacts[contact.id]?.phone ?? contact.phone ?? "",
                        },
                      })
                    }
                    style={styles.tableInput}
                    value={draftContacts[contact.id]?.email ?? contact.email ?? ""}
                  />
                </td>
                <td style={styles.td}>{contact.company ?? "-"}</td>
                <td style={styles.td}>{contact.position ?? "-"}</td>
                <td style={styles.td}>{contact.source ?? "-"}</td>
                <td style={styles.td}>
                  <div style={styles.rowActions}>
                    <button disabled={busy} onClick={() => updateContact(contact.id)} style={styles.secondaryButton}>
                      Save
                    </button>
                    <button disabled={busy} onClick={() => deleteContact(contact.id)} style={styles.dangerButton}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function contactName(contact: Contact) {
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() || "Unnamed";
}

function cleanForm(form: ContactForm) {
  return Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim() || undefined]));
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "32px",
    background: "#f7f8fb",
    color: "#172033",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  },
  header: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "24px",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  eyebrow: {
    color: "#637083",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: 0,
    margin: "0 0 6px",
    textTransform: "uppercase",
  },
  title: {
    fontSize: "34px",
    lineHeight: 1.1,
    margin: 0,
  },
  uploadButton: {
    background: "#166534",
    borderRadius: "8px",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700,
    padding: "11px 16px",
  },
  fileInput: {
    display: "none",
  },
  secondaryButton: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    color: "#172033",
    cursor: "pointer",
    fontWeight: 800,
    padding: "10px 14px",
  },
  primaryButton: {
    background: "#1d4ed8",
    border: 0,
    borderRadius: "8px",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 800,
    padding: "11px 16px",
  },
  form: {
    background: "#ffffff",
    border: "1px solid #dfe5ee",
    borderRadius: "8px",
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    marginBottom: "16px",
    padding: "16px",
  },
  toolbar: {
    alignItems: "center",
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "minmax(220px, 420px) 1fr",
    marginBottom: "14px",
  },
  input: {
    border: "1px solid #d8dee8",
    borderRadius: "8px",
    fontSize: "14px",
    padding: "11px 12px",
  },
  search: {
    border: "1px solid #d8dee8",
    borderRadius: "8px",
    fontSize: "14px",
    padding: "11px 12px",
  },
  meta: {
    color: "#637083",
    fontSize: "13px",
  },
  tableWrap: {
    background: "#ffffff",
    border: "1px solid #dfe5ee",
    borderRadius: "8px",
    overflowX: "auto",
  },
  table: {
    borderCollapse: "collapse",
    minWidth: "920px",
    width: "100%",
  },
  th: {
    background: "#eef2f7",
    borderBottom: "1px solid #dfe5ee",
    color: "#526074",
    fontSize: "12px",
    fontWeight: 800,
    padding: "13px 16px",
    textAlign: "left",
    textTransform: "uppercase",
  },
  td: {
    borderBottom: "1px solid #edf1f6",
    fontSize: "14px",
    padding: "14px 16px",
    verticalAlign: "top",
  },
  tableInput: {
    border: "1px solid #d8dee8",
    borderRadius: "8px",
    fontSize: "14px",
    minWidth: "150px",
    padding: "8px 10px",
    width: "100%",
  },
  rowActions: {
    display: "flex",
    gap: "8px",
  },
  dangerButton: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: "8px",
    color: "#be123c",
    cursor: "pointer",
    fontWeight: 800,
    padding: "8px 10px",
  },
};
