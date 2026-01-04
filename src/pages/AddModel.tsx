import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { makeAuthenticatedRequest } from "../utils/Auth";

export function AddModel() {
  const [mode, setMode] = useState<"home" | "furniture">("home");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const navigate = useNavigate();

  const [homeName, setHomeName] = useState("");
  const [homeModelFile, setHomeModelFile] = useState<File | null>(null);
  const [homeTextureFiles, setHomeTextureFiles] = useState<FileList | null>(null);

  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [isContainer, setIsContainer] = useState(false);
  const [wallMountable, setWallMountable] = useState(false);
  const [itemModelFile, setItemModelFile] = useState<File | null>(null);
  const [itemTextureFiles, setItemTextureFiles] = useState<FileList | null>(null);
  const [itemImage, setItemImage] = useState<File | null>(null);

  const handleHomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeName || !homeModelFile) {
      setMessage({ type: "error", text: "Name and model file are required." });
      return;
    }

    setLoading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("name", homeName);
    formData.append("model_file", homeModelFile);
    if (homeTextureFiles) Array.from(homeTextureFiles).forEach((f) => formData.append("texture_files", f));

    try {
      const response = await makeAuthenticatedRequest("/digitalhomes/add_digital_home/", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: data.message || "Home added successfully!" });
        setTimeout(() => navigate("/"), 1500);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to add home." });
      }
    } catch {
      setMessage({ type: "error", text: "Network or server error." });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !itemModelFile) {
      setMessage({ type: "error", text: "Name and model file are required." });
      return;
    }

    setLoading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("name", itemName);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("type", type);
    formData.append("is_container", String(isContainer));
    formData.append("wall_mountable", String(wallMountable));
    formData.append("model_file", itemModelFile);
    if (itemTextureFiles) Array.from(itemTextureFiles).forEach((f) => formData.append("texture_files", f));
    if (itemImage) formData.append("image", itemImage);

    try {
      const response = await makeAuthenticatedRequest("/digitalhomes/add_custom_item/", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: data.message || "Custom item added successfully!" });
        setTimeout(() => navigate("/"), 1500);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to add custom item." });
      }
    } catch {
      setMessage({ type: "error", text: "Network or server error." });
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    if (mode === "home") {
      return (
        <form onSubmit={handleHomeSubmit} style={formStyle}>
          <Input label="Home Name *" value={homeName} onChange={setHomeName} placeholder="e.g., My Villa" />
          <FileInput label="Model File (.glb, .gltf) *" accept=".glb,.gltf" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHomeModelFile(e.target.files?.[0] || null)} />
          <FileInput label="Texture Files (optional)" multiple onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHomeTextureFiles(e.target.files)} />
          <SubmitButtons loading={loading} back={() => navigate("/")} text="Add Home" />
        </form>
      );
    }

    return (
      <form onSubmit={handleCustomItemSubmit} style={formStyle}>
        <Input label="Item Name *" value={itemName} onChange={setItemName} placeholder="e.g., Wooden Chair" />
        <TextArea label="Description" value={description} onChange={setDescription} placeholder="Enter item description..." />
        <Input label="Category" value={category} onChange={setCategory} placeholder="e.g., Living Room" />
        <Input label="Type" value={type} onChange={setType} placeholder="e.g., Chair" />
        <Checkbox label="Is Container?" checked={isContainer} onChange={setIsContainer} />
        <Checkbox label="Wall Mountable?" checked={wallMountable} onChange={setWallMountable} />
        <FileInput label="Model File (.glb, .gltf) *" accept=".glb,.gltf" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setItemModelFile(e.target.files?.[0] || null)} />
        <FileInput label="Texture Files (optional)" multiple onChange={(e: React.ChangeEvent<HTMLInputElement>) => setItemTextureFiles(e.target.files)} />
        <FileInput label="Preview Image (optional)" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setItemImage(e.target.files?.[0] || null)} />
        <SubmitButtons loading={loading} back={() => navigate("/")} text="Add Item" />
      </form>
    );
  };

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "1.5rem", textAlign: "center" }}>➕ Add New Model</h1>

        <div style={modeSwitchStyle}>
          <button
            onClick={() => setMode("home")}
            style={mode === "home" ? activeModeBtn : inactiveModeBtn}
          >
            🏠 Home Model
          </button>
          <button
            onClick={() => setMode("furniture")}
            style={mode === "furniture" ? activeModeBtn : inactiveModeBtn}
          >
            🪑 Custom Furniture
          </button>
        </div>

        {message && (
          <div style={{
            background: message.type === "success" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            border: `1px solid ${message.type === "success" ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "1rem",
            color: message.type === "success" ? "#4ade80" : "#f87171",
          }}>
            {message.text}
          </div>
        )}

        {renderForm()}
      </div>
    </div>
  );
}

const Input = ({ label, value, onChange, placeholder }: any) => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    <label style={labelStyle}>{label}</label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputStyle}
    />
  </div>
);

const TextArea = ({ label, value, onChange, placeholder }: any) => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    <label style={labelStyle}>{label}</label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      style={inputStyle}
    />
  </div>
);

const FileInput = ({ label, accept, multiple = false, onChange }: any) => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    <label style={labelStyle}>{label}</label>
    <input
      type="file"
      accept={accept}
      multiple={multiple}
      onChange={onChange}
      style={fileInputStyle}
    />
  </div>
);

const Checkbox = ({ label, checked, onChange }: any) => (
  <label style={{ color: "#64748b" }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{ marginRight: "0.5rem" }}
    />
    {label}
  </label>
);

const SubmitButtons = ({ loading, back, text }: any) => (
  <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
    <button
      type="submit"
      disabled={loading}
      style={{
        flex: 1,
        padding: "0.75rem",
        background: loading ? "#4b5563" : "#22c55e",
        border: "none",
        borderRadius: "8px",
        color: "#ffffff",
        cursor: loading ? "not-allowed" : "pointer",
        fontWeight: "bold",
        transition: "background 0.2s",
      }}
      onMouseOver={(e) => !loading && (e.currentTarget.style.background = "#16a34a")}
      onMouseOut={(e) => !loading && (e.currentTarget.style.background = "#22c55e")}
    >
      {loading ? "Uploading..." : text}
    </button>
    <button
      type="button"
      onClick={back}
      style={{
        flex: 1,
        padding: "0.75rem",
        background: "#3b82f6",
        border: "none",
        borderRadius: "8px",
        color: "#ffffff",
        cursor: "pointer",
        fontWeight: "bold",
      }}
    >
      ← Back
    </button>
  </div>
);

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#e7e9eb",
  color: "#1e293b",
  fontFamily: "system-ui, sans-serif",
  padding: "2rem",
};
const formStyle: React.CSSProperties = {
  background: "#ffffff",
  padding: "2rem",
  borderRadius: "12px",
  border: "1px solid rgba(0,0,0,0.1)",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};
const labelStyle: React.CSSProperties = { marginBottom: "0.5rem", color: "#64748b" };
const inputStyle: React.CSSProperties = {
  padding: "0.75rem",
  borderRadius: "6px",
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(0,0,0,0.1)",
  color: "#1e293b",
  outline: "none",
};
const fileInputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.1)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "6px",
  padding: "0.5rem",
  color: "#1e293b",
};
const modeSwitchStyle: React.CSSProperties = {
  display: "flex",
  gap: "1rem",
  justifyContent: "center",
  marginBottom: "1.5rem",
};
const activeModeBtn: React.CSSProperties = {
  flex: 1,
  padding: "0.75rem",
  background: "#3b82f6",
  border: "none",
  borderRadius: "8px",
  color: "#ffffff",
  fontWeight: "550",
  cursor: "pointer",
};
const inactiveModeBtn: React.CSSProperties = {
  ...activeModeBtn,
  background: "rgba(0,0,0,0.1)",
  color: "#64748b",
};

export default AddModel;
