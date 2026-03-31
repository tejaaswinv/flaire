"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/layout/app-shell";
import PageContainer from "../../components/ui/page-container";
import SectionCard from "../../components/ui/section-card";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import Select from "../../components/ui/select";
import { loadFromStorage, saveToStorage } from "../../lib/storage";
import { deleteFileBlob, getFileBlob, saveFileBlob } from "../../lib/file-db";
import type { FlaireVault, MedicalRecordRef } from "../../types/flaire-vault";

type RecordCategory = "lab_results" | "imaging" | "notes" | "other";
type FilterCategory = "all" | RecordCategory;

type PreviewMap = Record<string, string>;

export default function RecordsPage() {
  const [vault, setVault] = useState<FlaireVault | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<RecordCategory>("lab_results");
  const [sourceName, setSourceName] = useState("");
  const [recordDate, setRecordDate] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [previews, setPreviews] = useState<PreviewMap>({});

  useEffect(() => {
  let cancelled = false;

  async function init() {
    const data = await loadFromStorage<FlaireVault>();
    if (!data || cancelled) return;

    setVault({
      ...data,
      records: data.records ?? [],
    });
  }

  init();

  return () => {
    cancelled = true;
  };
}, []);

  useEffect(() => {
    let active = true;
    const urlsToRevoke: string[] = [];

    async function loadPreviews() {
      if (!vault) return;

      const nextPreviews: PreviewMap = {};

      for (const record of vault.records ?? []) {
        if (!record.fileId || !record.fileType?.startsWith("image/")) continue;

        const file = await getFileBlob(record.fileId);
        if (!file) continue;

        const url = URL.createObjectURL(file);
        urlsToRevoke.push(url);
        nextPreviews[record.fileId] = url;
      }

      if (active) {
        setPreviews(nextPreviews);
      }
    }

    loadPreviews();

    return () => {
      active = false;
      urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [vault]);

  const persist = async (updatedVault: FlaireVault) => {
  setVault(updatedVault);
  await saveToStorage(updatedVault);
};

  const filteredRecords = useMemo(() => {
    if (!vault) return [];

    const base = [...(vault.records ?? [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (filter === "all") return base;
    return base.filter((record) => record.category === filter);
  }, [vault, filter]);

  const storageSummary = useMemo(() => {
    if (!vault) return { totalFiles: 0, totalBytes: 0 };

    const totalBytes = (vault.records ?? []).reduce(
      (sum, record) => sum + (record.sizeBytes ?? 0),
      0
    );

    return {
      totalFiles: (vault.records ?? []).length,
      totalBytes,
    };
  }, [vault]);

  if (!vault) {
    return <div className="p-8">Loading...</div>;
  }

  const addRecord = async () => {
    if (!title.trim()) return;

    const now = new Date().toISOString();
    let fileId: string | undefined;
    let fileName: string | undefined;
    let fileType: string | undefined;
    let sizeBytes: number | undefined;

    if (selectedFile) {
      fileId = crypto.randomUUID();
      await saveFileBlob(fileId, selectedFile);
      fileName = selectedFile.name;
      fileType = selectedFile.type;
      sizeBytes = selectedFile.size;
    }

    const newRecord: MedicalRecordRef = {
      id: crypto.randomUUID(),
      title: title.trim(),
      category,
      sourceName: sourceName.trim() || undefined,
      fileId,
      fileName,
      fileType,
      sizeBytes,
      recordDate: recordDate || undefined,
      localPath: localPath.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    await persist({
      ...vault,
      records: [newRecord, ...(vault.records ?? [])],
      updatedAt: now,
    });

    setTitle("");
    setCategory("lab_results");
    setSourceName("");
    setRecordDate("");
    setLocalPath("");
    setSelectedFile(null);
  };

  const deleteRecord = async (record: MedicalRecordRef) => {
    if (record.fileId) {
      await deleteFileBlob(record.fileId);
    }

    await persist({
      ...vault,
      records: (vault.records ?? []).filter((item) => item.id !== record.id),
      updatedAt: new Date().toISOString(),
    });
  };

  const openRecordFile = async (record: MedicalRecordRef) => {
    if (!record.fileId) return;

    const file = await getFileBlob(record.fileId);
    if (!file) return;

    const url = URL.createObjectURL(file);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const categoryLabel = (value: RecordCategory) => {
    if (value === "lab_results") return "Lab Results";
    if (value === "imaging") return "Imaging";
    if (value === "notes") return "Notes";
    return "Other";
  };

  const fileTone = (record: MedicalRecordRef) => {
    if (record.fileType?.startsWith("image/")) return "bg-[#f7f3f8] text-slate-700";
    if (record.fileType === "application/pdf") return "bg-red-100 text-red-700";
    return "bg-[#eef4fb] text-slate-700";
  };

  return (
    <AppShell>
      <PageContainer
        title="Medical Records"
        subtitle="Store record metadata locally and keep uploaded files on-device"
        actions={<Button onClick={addRecord}>+ Add Record</Button>}
      >
        <div className="space-y-8">
          <SectionCard title="Add Record Reference">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Record title"
              />

              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as RecordCategory)}
              >
                <option value="lab_results">Lab Results</option>
                <option value="imaging">Imaging</option>
                <option value="notes">Notes</option>
                <option value="other">Other</option>
              </Select>

              <Input
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="Hospital, clinic, lab, doctor"
              />

              <Input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
              />
            </div>

            <Input
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              placeholder="Optional local file note or path"
              className="mt-4"
            />

            <div className="mt-4">
              <label className="mb-2 block text-sm text-slate-500">
                Upload document / X-ray / scan
              </label>
              <input
                type="file"
                accept=".pdf,image/*,.doc,.docx"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="block w-full rounded-xl border border-slate-200 px-4 py-3"
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-slate-500">
                  Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
                </p>
              )}
            </div>
          </SectionCard>

          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.8fr]">
            <SectionCard title="Records Library">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div />
                <Select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as FilterCategory)}
                  className="max-w-[180px]"
                >
                  <option value="all">All</option>
                  <option value="lab_results">Lab Results</option>
                  <option value="imaging">Imaging</option>
                  <option value="notes">Notes</option>
                  <option value="other">Other</option>
                </Select>
              </div>

              {filteredRecords.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-slate-500">
                  No records added yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRecords.map((record) => (
                    <div
                      key={record.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-xl font-semibold text-slate-800">
                              {record.title}
                            </p>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                              {categoryLabel(record.category)}
                            </span>
                            {record.fileName ? (
                              <span className={`rounded-full px-3 py-1 text-sm ${fileTone(record)}`}>
                                {record.fileType?.startsWith("image/")
                                  ? "Image"
                                  : record.fileType === "application/pdf"
                                  ? "PDF"
                                  : "Document"}
                              </span>
                            ) : null}
                          </div>

                          {record.fileId && previews[record.fileId] ? (
                            <div className="mt-4">
                              <img
                                src={previews[record.fileId]}
                                alt={record.title}
                                className="max-h-56 rounded-xl border border-slate-200 object-cover"
                              />
                            </div>
                          ) : null}

                          {record.sourceName && (
                            <p className="mt-3 text-slate-600">
                              Source: {record.sourceName}
                            </p>
                          )}

                          {record.recordDate && (
                            <p className="mt-1 text-sm text-slate-500">
                              Date: {new Date(record.recordDate).toLocaleDateString()}
                            </p>
                          )}

                          {record.fileName && (
                            <p className="mt-1 text-sm text-slate-500">
                              File: {record.fileName}
                            </p>
                          )}

                          {record.localPath && (
                            <p className="mt-1 text-sm text-slate-500">
                              Local note: {record.localPath}
                            </p>
                          )}

                          {typeof record.sizeBytes === "number" && (
                            <p className="mt-1 text-sm text-slate-500">
                              Size: {formatBytes(record.sizeBytes)}
                            </p>
                          )}

                          {record.fileId ? (
                            <div className="mt-4">
                              <Button variant="soft" onClick={() => openRecordFile(record)}>
                                Open file
                              </Button>
                            </div>
                          ) : null}
                        </div>

                        <button
                          onClick={() => deleteRecord(record)}
                          className="text-2xl text-slate-500 hover:text-red-500"
                          aria-label="Delete record"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <div className="space-y-6">
              <SectionCard title="Storage Summary">
                <div className="space-y-2 text-slate-600">
                  <p>Total records: {storageSummary.totalFiles}</p>
                  <p>Known file size: {formatBytes(storageSummary.totalBytes)}</p>
                </div>
              </SectionCard>

              <SectionCard title="Preview Support">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#f7f3f8] px-3 py-1.5 text-sm text-slate-700">
                    X-rays / Images preview
                  </span>
                  <span className="rounded-full bg-red-100 px-3 py-1.5 text-sm text-red-700">
                    PDF supported
                  </span>
                  <span className="rounded-full bg-[#eef4fb] px-3 py-1.5 text-sm text-slate-700">
                    Docs stored locally
                  </span>
                </div>
              </SectionCard>

              <SectionCard title="Privacy Note">
                <p className="text-slate-600">
                  Uploaded documents remain on this device in browser storage. Image files can be previewed locally without sending them to a server.
                </p>
              </SectionCard>
            </div>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}