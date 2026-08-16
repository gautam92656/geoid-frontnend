"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlusIcon, UiButton, type SelectOption } from "@/shared/components/ui";
import { MAX_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import { showApiError } from "@/shared/utils/apiToast";
import { API_ERROR_MESSAGES } from "@/shared/constants/apiMessages";
import { LAB_TESTS_MODULE_ID } from "../utils/configModules";
import { getUserLabTestPresets, getUserLabTestTypes } from "../services/configModulesApi";
import { listProjectLogs } from "../services/logApi";
import { listSuppliers } from "../services/supplierApi";
import { parseLabTestPresetOptions } from "../utils/configModules/labTestPreset";
import { parseLabTestTypeOptions } from "../utils/configModules/labTestType";
import type { Project } from "../types/project";
import {
  CreateLabTestRequestModal,
  type CreateLabTestRequestPayload,
  type LabTestRequestPresetOption,
} from "./CreateLabTestRequestModal";

type LabTestsSectionProps = Readonly<{
  project: Project;
}>;

export function LabTestsSection({ project }: LabTestsSectionProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [labOptions, setLabOptions] = useState<SelectOption[]>([]);
  const [logOptions, setLogOptions] = useState<SelectOption[]>([]);
  const [presetOptions, setPresetOptions] = useState<LabTestRequestPresetOption[]>([]);
  const [labTestTypeOptions, setLabTestTypeOptions] = useState<SelectOption[]>([]);

  const logConfigurationId = project.logConfigId;

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const [suppliersResult, logsResult, typesResult, presetsResult] = await Promise.all([
        listSuppliers(1, MAX_TABLE_PAGE_SIZE, {
          supplierType: "Laboratory",
          status: "active",
        }),
        listProjectLogs(project.id, 1, MAX_TABLE_PAGE_SIZE),
        logConfigurationId
          ? getUserLabTestTypes(LAB_TESTS_MODULE_ID, logConfigurationId)
          : Promise.resolve({ data: [] }),
        logConfigurationId
          ? getUserLabTestPresets(LAB_TESTS_MODULE_ID, logConfigurationId)
          : Promise.resolve({ data: [] }),
      ]);

      setLabOptions(
        suppliersResult.data.map((supplier) => ({
          value: String(supplier.id),
          label: supplier.businessName,
        }))
      );

      setLogOptions(
        logsResult.data.map((log) => ({
          value: String(log.id),
          label: log.logNumber || `Log ${log.id}`,
        }))
      );

      const types = parseLabTestTypeOptions(typesResult.data, []);
      setLabTestTypeOptions(types.map((entry) => ({ value: entry.id, label: entry.name })));

      const presets = parseLabTestPresetOptions(presetsResult.data, []);
      setPresetOptions(
        presets.map((entry) => ({
          value: entry.id,
          label: entry.name,
          labTestTypeIds: [...entry.labTestTypeIds],
        }))
      );
    } catch (err) {
      showApiError(err, API_ERROR_MESSAGES.LOAD_LABORATORIES);
      setLabOptions([]);
      setLogOptions([]);
      setPresetOptions([]);
      setLabTestTypeOptions([]);
    } finally {
      setLoadingOptions(false);
    }
  }, [logConfigurationId, project.id]);

  useEffect(() => {
    if (!createOpen) return;
    void loadOptions();
  }, [createOpen, loadOptions]);

  const emptyCopy = useMemo(
    () => ({
      title: "Lab test requests",
      body: "Create a lab test request to send samples and test requirements to a laboratory.",
    }),
    []
  );

  const handleSubmit = async (_payload: CreateLabTestRequestPayload) => {
    void _payload;
    // Persistence API is not wired yet; modal still validates and closes on success.
  };

  return (
    <div className="lab-tests-section">
      <div className="lab-tests-section__header">
        <div className="lab-tests-section__copy">
          <h2 className="lab-tests-section__title">Lab Tests</h2>
          <p className="lab-tests-section__subtitle">
            Manage laboratory test requests for this project.
          </p>
        </div>
        <UiButton type="button" variant="primary" onClick={() => setCreateOpen(true)}>
          <span className="lab-tests-section__create-btn">
            <PlusIcon />
            <span>Create Lab Test Request</span>
          </span>
        </UiButton>
      </div>

      <div className="lab-tests-section__empty">
        <p className="lab-tests-section__empty-title">{emptyCopy.title}</p>
        <span className="lab-tests-section__empty-body">{emptyCopy.body}</span>
      </div>

      <CreateLabTestRequestModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        logConfigurationId={logConfigurationId}
        labOptions={labOptions}
        logOptions={logOptions}
        presetOptions={presetOptions}
        labTestTypeOptions={labTestTypeOptions}
        loadingOptions={loadingOptions}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
